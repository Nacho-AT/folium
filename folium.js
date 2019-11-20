/**
 * FoliumTable Version: 1.1.3-BETA 
 */
class FoliumTable {

    constructor(settings, table) {

        if (settings.columns === undefined) {
            console.error('"columns" property is not defined in table settings. Please make sure that it is defined in your table settings.');
            return;
        }

        settings.rows = settings.rows === undefined ? [] : settings.rows;

        const _object = this;

        let rowCount = settings.rows.length;
        let columnCount = settings.columns.length;
        let nextRowId = 0;
        let selectedRow = -1;
        let selectedRowId = -1;
        let selectedRowObject = undefined;
        let selectedColumn = -1;
        let selectedColumnObject = undefined;
        let tableId = settings.tableId;
        let cellRenderer = undefined;
        let headerRenderer = undefined;
        let tableLocale = 'en-US';
        let searchFunction = function(row) { return true; };
        let searchingActive = false;
        let searchColumnIndex = -1;
        let sortingColumnIndex = -1;
        let searchResult = undefined;
        let rowsAsArrays = undefined;
        let rowIdsRendered = [];
        
        const pagination = { pageSize : -1, numOfPages : 0, currentPage : 1 };
        const sortingOrders = new Map();
        const columnSortingFunctions = new Map();
        const events = new Map();
        const dataTypeParses = new Map();
        events.set('rowClicked', function(rowIndex) {});
        events.set('rowDoubleClicked', function(rowIndex) {}); 
        
        // Set pagination object to default if it's not defined by user
        settings.pagination = settings.pagination === undefined ? { active : false, size : -1 } : settings.pagination;
        settings.sortable = settings.sortable === undefined || typeof settings.sortable !== 'boolean' ? false : settings.sortable;
        settings.editable = settings.editable === undefined || typeof settings.editable !== 'boolean' ? false : settings.editable;
        settings.showSearchHint = settings.showSearchHint === undefined || typeof settings.showSearchHint !== 'boolean' ? true : settings.showSearchHint;
        settings.searchTipText = settings.searchTipText === undefined || settings.searchTipText === null 
            ? function(numRowsFiltered) { return `${numRowsFiltered} row(s) presented.`; } 
            : settings.searchTipText;

        // If _ROW_ID column id exist then don't let the table to be drawn.
        if(settings.columns.filter(column => column.columnId === '_ROW_ID').length > 0) {
            console.error('_ROW_ID is specifically defined column for Folium Table. Please try to name this column with a different name.');
            return;
        }
        settings.rows.forEach(row => {
            Object.defineProperty(row, '_ROW_ID', {value : nextRowId, writable : false, enumerable : true, configurable : false});
            nextRowId++;
        });

        function setSelectedRow(rowIndex) {
            if (rowIndex === -1) {
                selectedRow = -1;
                selectedRowObject = undefined;
                return;
            }
    
            if(tableId !== $(document).attr('activeTable')) return;
            
            selectedRow = rowIndex;
            selectedRowId = settings.rows[rowIndexToModel(rowIndex)]._ROW_ID;
            if (selectedRowObject !== undefined) selectedRowObject.removeClass('selectedRow');
            const domRowIndex = new Number(rowIndex).toString();
    
            selectedRowObject = $(`#${tableId} tbody tr:eq(${domRowIndex})`);
            selectedRowObject.focus();
            selectedRowObject.addClass('selectedRow');
        }
    
        function setSelectedColumn(columnIndex) {
            if (columnIndex >= columnCount) return;
            if(tableId !== $(document).attr('activeTable')) return;
            
            $(`#${tableId} thead th:eq(${selectedColumn})`).removeClass('selectedColumnHeader');
            selectedColumn = columnIndex;
    
            if (selectedColumnObject !== undefined) selectedColumnObject.removeClass('selectedColumn');
    
            const domRowIndex = new Number(selectedRow).toString();
            
            selectedColumnObject = $(`#${tableId} tbody tr:eq(${domRowIndex})`).find(`td:eq(${columnIndex})`);
            selectedColumnObject.addClass('selectedColumn');
            $(`#${tableId} thead th:eq(${selectedColumn})`).addClass('selectedColumnHeader');
            selectedColumnObject.focus();
        }
    
        function stringSort(a, b) {
                    return a.localeCompare(b, tableLocale);
                }
        
        function numberSort(a, b) {
            return a - b;
        }
        
        function dateSort(a, b) {
            if (a > b) return 1;
            else if (a < b) return -1;
                    
            return 0;
        }
    
        function sortTable(columnIndex, reverseSorting = true) {
            if (columnIndex === -1) return;
    
            if (settings.sortable) {
                const columnId = settings.columns[columnIndex].columnId;
                const columnSortingType = settings.columns[columnIndex].dataType;
    
                let sortingType = sortingOrders.get(columnId);
                //Sort the table in a reverse order after clicking the same header.
                if (reverseSorting) {
                    sortingType *= -1;
                    sortingOrders.set(columnId, sortingType);
                }

                const sortFunction = columnSortingFunctions.get(columnSortingType);
                const elementAccessor = rowsAsArrays ? columnIndex : columnId;

                if (searchingActive) searchResult.sort((a, b) => sortingType * sortFunction(a[elementAccessor], b[elementAccessor]));
                else settings.rows.sort((a, b) => sortingType * sortFunction(a[elementAccessor], b[elementAccessor]));
            }
            
        }
    
        function updatePageBarInfo(tableRows = settings.rows) {
            
            const numPagesMod = tableRows.length % pagination.pageSize;
            
            pagination.numOfPages = parseInt(tableRows.length / pagination.pageSize);
            pagination.numOfPages = numPagesMod !== 0 ? pagination.numOfPages + 1 : pagination.numOfPages;
    
            const pageDataStartIndex = (pagination.currentPage - 1) * pagination.pageSize + 1;
            const pageDataEndIndex = pageDataStartIndex + tableRows.slice((pagination.currentPage - 1) * pagination.pageSize, pagination.currentPage * pagination.pageSize).length - 1;

            if ($(`#foliumPageJumpTo option`).length !== pagination.numOfPages) {
                $(`#foliumPageJumpTo`).empty();
                
                let optionList = '';

                for (let i = 2 ; i <= pagination.numOfPages ; i++) 
                    optionList += `<option value="${i}">${i}</option>`;
                
                $(`#foliumPageSwitcher`).html(`<select id="foliumPageJumpTo" class="pageJumpComboBox"><option value="1">1</option>${optionList}</select> / ${pagination.numOfPages}`);
                
                $(`#foliumPageJumpTo`).change(function() {
                    
                    pagination.currentPage = parseInt($(this).val());
                    updateTableByPagination(searchingActive ? searchResult : settings.rows);
                });

            }

            $(`#foliumPageJumpTo option:selected`).prop('selected', false);
            $(`#foliumPageJumpTo option[value=${pagination.currentPage}]`).prop('selected', true);
            $(`#currentPageInfo`).html(`${pageDataStartIndex}-${pageDataEndIndex} | Page: `);
        }
    
        function updateTableByPagination(tableRows = settings.rows) {
                 
            $(`#${settings.tableId} tbody`).remove();
            initRows(tableRows);
            updatePageBarInfo(tableRows);
        }
    
        function initColumns(tableColumns) {
            let columnsHTML = '<thead><tr id="columns">';
            tableColumns.forEach((column, columnIndex) => columnsHTML += `<th class="columnHeader sortHeader" id="${column.columnId}">${headerRenderer(columnIndex, column.displayText, column)}</th>`);
            columnsHTML += "</tr>"
            
            table.append(columnsHTML + '</thead>');
        }
    
        function initRows(tableRows = settings.rows) {
            let rows = settings.pagination.active ? tableRows.slice((pagination.currentPage - 1) * pagination.pageSize, pagination.currentPage * pagination.pageSize) : tableRows;
            let rowsHTML = '';
            rowIdsRendered = [];

            rows.forEach((row, index) => {
                const rowClass = index % 2 === 0 ? 'evenRow' : 'oddRow';
                let rowHTML = `<tr class="${rowClass}">`;
    
                settings.columns.forEach((column, columnIndex) => {
                    const columnValue = rowsAsArrays ? row[columnIndex] : row[column.columnId];
                    
                    // Render the value presented from the settings.
                    const value = cellRenderer(index, columnIndex, columnValue, row);
                    const tdOutput = columnValue === undefined ? '<td></td>' : `<td>${value}</td>`;
                    rowHTML += tdOutput;
                });
    
                rowHTML += '</tr>';
                rowsHTML += rowHTML;
                rowIdsRendered.push(row._ROW_ID);
            });

            table.append('<tbody>' + rowsHTML + '</tbody>');

            //If the row is selected as before then render it as selected row.
            const selectedRowIdIndex = rows.map(row => row._ROW_ID).indexOf(selectedRowId);
            
            if (selectedRowIdIndex !== -1) {
                const selectedTrObject = $(`#${tableId} tbody tr:eq(${selectedRowIdIndex})`);
                
                selectedTrObject.removeClass();
                selectedTrObject.addClass('selectedRow');

                const selectedTdObject = selectedTrObject.find(`td:eq(${selectedColumn})`);
                selectedTdObject.addClass('selectedColumn');

                selectedRowObject = selectedTrObject;
                selectedColumnObject = selectedTdObject;       
            }
    
        $(`#${tableId} tbody`).on('click', 'td', function(){
            const selectedRowObject = $(this).parent();
            const selectedColumnObject = $(this);
    
            const rowIndex = selectedRowObject.index();
            const columnIndex = selectedColumnObject.index();
    
            setSelectedRow(rowIndex);
            setSelectedColumn(columnIndex);
            events.get('rowClicked')(rowIndex);
         });
    
         $(`#${settings.tableId} tbody td`).dblclick(function() {
            const selectedRowObject = $(this).parent();
            const rowIndex = selectedRowObject.index();
    
            activateCellEditor($(this));
            events.get('rowDoubleClicked')(rowIndex);
         });
        }

        function rowIndexToModel(rowIndex) {
            if (rowIndex === -1) return -1;

            if (searchingActive) {
                const rowIndexInSearchModel = settings.pagination.active ? (pagination.currentPage - 1) * pagination.pageSize  + rowIndex : rowIndex;
                const rowId = searchResult[rowIndexInSearchModel]._ROW_ID;
                const rowIndexInModel = settings.rows.map(row => row._ROW_ID).indexOf(rowId);

                return rowIndexInModel;
            }
            return settings.pagination.active ? (pagination.currentPage - 1) * pagination.pageSize  + rowIndex : rowIndex;
        }
    
        function activateCellEditor(tdObject) {

            const ENTER_KEY_CODE = 13;
            const inputBoxWidth = tdObject.css('width');
            const rowIndex = tdObject.parent().index();
            const columnIndex = tdObject.index();
            const rowIndexModel = settings.pagination.active ? rowIndexToModel(rowIndex) : rowIndex;
            const columnId = settings.columns[columnIndex].columnId;
            const value = rowsAsArrays ? settings.rows[rowIndexModel][columnIndex] : settings.rows[rowIndexModel][columnId];

            if (!settings.editable) return;

            tdObject.html(`<input type="text" id="cellEditor" style="width:${inputBoxWidth}" value="${value}" />`);
            const cellEditor = $('#cellEditor');
            cellEditor.focus();
            cellEditor[0].setSelectionRange(value.length, value.length);
            $('#cellEditor').focusout(function() {
                let newValue = cellEditor.val();
                
                // Parse the new value according to column data type.
                newValue = dataTypeParses.get(settings.columns[columnIndex].dataType)(newValue);
                
                if (rowsAsArrays) settings.rows[rowIndexModel][columnIndex] = newValue;
                else settings.rows[rowIndexModel][columnId] = newValue;

                const valueRendered = cellRenderer(rowIndex, columnIndex, newValue, settings.rows[rowIndexModel]);

                tdObject.html(valueRendered);
    
            });
            // If user presses enter then focus out
            $('#cellEditor').keypress(event => {
                if (event.keyCode === ENTER_KEY_CODE) {
                    setSelectedColumn(columnIndex + 1);
                    table.focus();
                }
        });
        }
    
        columnSortingFunctions.set('number', numberSort);
        columnSortingFunctions.set('float', numberSort);
        columnSortingFunctions.set('integer', numberSort);
        columnSortingFunctions.set('datetime', dateSort);
        columnSortingFunctions.set('string', stringSort);
        columnSortingFunctions.set(undefined, stringSort);

        dataTypeParses.set('integer', function(val) { return parseInt(val); });
        dataTypeParses.set('float', function(val) { return parseFloat(val); });
        dataTypeParses.set('number', function(val) { return parseFloat(val); });
        dataTypeParses.set('datetime', function(val) { return new Date(val); });
        dataTypeParses.set('integer', function(val) { return val.toString(); });
        dataTypeParses.set(undefined, function(val) { return val.toString(); });
    
        table.addClass('folium');
        table.attr('tabindex', '0');
        
        rowsAsArrays = settings.rowsAsArrays !== undefined && settings.rowsAsArrays !== null && typeof settings.rowsAsArrays === 'boolean'  ? settings.rowsAsArrays : false;

        cellRenderer = settings.cellRenderer !== undefined ? settings.cellRenderer : function(rowIndex, columnIndex, data, rowObject) { return data; };
        headerRenderer = settings.headerRenderer !== undefined ? settings.headerRenderer : function(columnIndex, displayText, columnObject) { return displayText; };

        if (settings.width !== undefined) $('.folium').css('width', `${settings.width}`);
        if (settings.height !== undefined) $('.folium').css('height', `${settings.height}`);
        
        const tableColumns = settings.columns;
        
        // Set sorting orders to ASC
        tableColumns.forEach(column => sortingOrders.set(column.columnId, -1));

        // Init columns
        initColumns(tableColumns);
                
        // If pagination is active then set up the pagination settings.
        if (settings.pagination.active && typeof settings.pagination.size === 'number') {
            
            $(`#${tableId}`).before(`<div class="foliumPageBar"><button id="${tableId}foliumPageFirst" class="pageBarButton">First</button><button class="pageBarButton" id="${tableId}foliumPagePrevious"><</button><div id="${tableId}pageInfo" class="infoBox"><span id="currentPageInfo"></span><div id="foliumPageSwitcher"><select id="foliumPageJumpTo" class="pageJumpComboBox"><option value="1">1</option></select> / 0</div></div><button class="pageBarButton" id="${tableId}foliumPageNext">></button><button class="pageBarButton" id="${tableId}foliumPageLast">Last</button><span id="searchInfo" class="pageBarText"></span></div>`);

            $('.foliumPageBar').css('width', $(`#${tableId}`).css('width'));
            pagination.pageSize = settings.pagination.size;
            updatePageBarInfo();
            
            // Switch to the next page                
            $(`#${tableId}foliumPageNext`).click(() => {
                if (pagination.currentPage + 1 > pagination.numOfPages) return;
                
                pagination.currentPage++;
                updateTableByPagination(searchingActive ? searchResult : settings.rows);
            });
            $(`#${tableId}foliumPagePrevious`).click(() => {
                if (pagination.currentPage - 1 < 1) return;
                
                pagination.currentPage--;
                updateTableByPagination(searchingActive ? searchResult : settings.rows);
            });
            $(`#${tableId}foliumPageFirst`).click(() => {
                if (pagination.currentPage === 1) return ; 
                pagination.currentPage = 1;
                updateTableByPagination(searchingActive ? searchResult : settings.rows);
            });
            $(`#${tableId}foliumPageLast`).click(() => {
                if (pagination.currentPage === pagination.numOfPages) return ;
                pagination.currentPage = pagination.numOfPages;
                updateTableByPagination(searchingActive ? searchResult : settings.rows);
            });
        }
        if (settings.pagination.size === undefined) console.error('Pagination size is not defined! Pagination skipped.');
        // Init Rows
        initRows();


        $('td,th').on('focus', () => {
            $(this).closest('table').focus();
          }
        );
        
        $(`#${settings.tableId}`).focus(() => {
            $(document).attr('activeTable', settings.tableId);
        });

        $(`#${settings.tableId}`).focusout(() => {
            $(document).attr('activeTable', null);
        });

         // Sorting event
         $(`#${tableId} thead th`).click(function() {
            const selectedHeaderIndex = $(this).index();
            sortingColumnIndex = selectedHeaderIndex;
            setSelectedColumn(selectedHeaderIndex);
            if (settings.sortable) {
                sortTable(selectedHeaderIndex);
                $(`#${settings.tableId} tbody`).remove();
                initRows(searchingActive ? searchResult : settings.rows);
            }
            
         });

         $(document).keydown(event => {
            const activeTable = $(document).attr('activeTable');
            const keyCode = event.keyCode;
            
            if ((activeTable === null || activeTable === undefined) || activeTable !== tableId) return;

            const LEFT_ARROW_KEY_CODE = 37;
            const UP_ARROW_KEY_CODE = 38;
            const RIGHT_ARROW_KEY_CODE = 39;
            const DOWN_ARROW_KEY_CODE = 40;
            
            if (keyCode === LEFT_ARROW_KEY_CODE) {
                if (selectedColumn <= 0) return;
                
                setSelectedColumn(selectedColumn - 1);
                return;
            }
            else if (keyCode === UP_ARROW_KEY_CODE) {
                if (selectedRow <= 0) return;
                
                setSelectedRow(selectedRow - 1);
                setSelectedColumn(selectedColumn);
                return;
            }
            else if (keyCode === RIGHT_ARROW_KEY_CODE) {
                if (selectedColumn === columnCount - 1) return;

                setSelectedColumn(selectedColumn + 1);
                return;
            }
            else if (keyCode === DOWN_ARROW_KEY_CODE) {
                const currentPageRowCount = $(`#${tableId} tbody tr`).length;
                const lastRowIndex = settings.pagination.active ? currentPageRowCount - 1 : rowCount - 1;
                
                if (selectedRow === lastRowIndex) return;
                
                setSelectedRow(selectedRow + 1);
                setSelectedColumn(selectedColumn);
                return;
            }

            if (settings.editable) activateCellEditor(selectedColumnObject);
            
        });

        _object.addRow = function(rowObject) {
            
            Object.defineProperty(rowObject, '_ROW_ID', {value : nextRowId, writable : false, enumerable : true, configurable : false});
            nextRowId++;
            
            settings.rows.push(rowObject);
            let newRowPosition = rowCount === 0 ? 0 : rowCount;
            
            rowCount += 1;
            
            // If searching is active then render the table with search result by calling search function again.
            if (searchingActive) {
                this.search(searchFunction);
                return;
            }
            
            if (sortingColumnIndex !== -1) {
                sortTable(sortingColumnIndex, false);
                newRowPosition = settings.rows.map(row => row._ROW_ID).indexOf(rowObject._ROW_ID);
            }

            if (settings.pagination.active) {
                updateTableByPagination();
                return;
            }
            
            const rowClass = newRowPosition % 2 === 0 ? 'evenRow' : 'oddRow';
            let rowHTML = `<tr class="${rowClass}">`;
            
            settings.columns.forEach((column, columnIndex) => {
                const columnValue = rowsAsArrays ? rowObject[columnIndex] : rowObject[column.columnId];
    
                // Render the value presented from the settings.
                const value = cellRenderer(newRowPosition, columnIndex, columnValue, rowObject);
                const tdOutput = columnValue === undefined ? '<td></td>' : `<td>${value}</td>`;
                rowHTML += tdOutput;
            });
    
            rowHTML += '</tr>';
            rowIdsRendered.push(rowObject._ROW_ID);

            if (rowCount === 1) $(`#${tableId} tbody`).append(rowHTML);
            else if (newRowPosition === 0) $(`#${tableId} tbody tr:eq(0)`).before(rowHTML);
            else $(`#${tableId} tbody tr:eq(${newRowPosition - 1})`).after(rowHTML);
        };
        _object.addRows = function(rows) {

            rows.forEach(row => {
                Object.defineProperty(row, '_ROW_ID', {value : nextRowId, writable : false, enumerable : true, configurable : false})
                nextRowId++;  
            });
            settings.rows = settings.rows.concat(rows);
            //rowCount += rows.length;

            if (searchingActive) {
                this.search(searchFunction);
                return;
            }

            if (sortingColumnIndex !== -1) 
                sortTable(sortingColumnIndex, false);
            

            if (settings.pagination.active) {
                updateTableByPagination();
                return;
            }

            // If sorting is active then re-render the whole table.
            if (sortingColumnIndex !== -1) {
                $(`#${tableId} tbody`).empty();
                initRows(searchingActive ? searchResult : settings.rows);
                return;
            }
            
            let rowsHTML = '';

            rows.forEach(rowObject => {
                const rowClass = rowCount % 2 === 0 ? 'evenRow' : 'oddRow';
                let rowHTML = `<tr class="${rowClass}">`;
                
                settings.columns.forEach((column, columnIndex) => {
                    const columnValue = rowsAsArrays ? rowObject[columnIndex] : rowObject[column.columnId];
        
                    // Render the value presented from the settings.
                    const value = cellRenderer(rowCount - 1, columnIndex, columnValue, rowObject);
                    const tdOutput = columnValue === undefined ? '<td></td>' : `<td>${value}</td>`;
                    rowHTML += tdOutput;
                });
        
                rowHTML += '</tr>';
                rowsHTML += rowHTML;

                rowCount++;
                rowIdsRendered.push(rowObject._ROW_ID);

            });

            $(`#${tableId} tbody`).append(rowsHTML);

        };
    
        _object.updateRow = function(index, rowObject) {
    
            if (rowsAsArrays) {
                Object.defineProperty(rowObject, '_ROW_ID', {value : settings.rows[index]._ROW_ID, writable : false, enumerable : true, configurable : false});
                settings.rows[index] = rowObject;
            }
            else Object.keys(rowObject).forEach(property => settings.rows[index][property] = rowObject[property]);
    
            const rowToUpdate = settings.rows[index];
            let rowHTML = '';
            
            settings.columns.forEach((column, columnIndex) => {
                const columnValue = rowsAsArrays ? rowToUpdate[columnIndex] : rowToUpdate[column.columnId];
    
                // Render the value presented from the settings.
                const value = cellRenderer(rowCount - 1, columnIndex, columnValue, rowToUpdate);
                const tdOutput = columnValue === undefined ? '<td></td>' : `<td>${value}</td>`;
                rowHTML += tdOutput;
            });

            const rowTableUpdateIndex = rowIdsRendered.indexOf(rowToUpdate._ROW_ID);
            if (rowTableUpdateIndex !== -1) $(`#${tableId} tbody tr:eq(${rowTableUpdateIndex})`).html(rowHTML);
        };

        _object.updateRows = function(indexes, rows) {
            indexes.forEach((i, elemIndex) => this.updateRow(i, rows[elemIndex]));
        };
    
        _object.deleteRow = function(index) {
            const removedRow = settings.rows.splice(index, 1)[0];

            if (removedRow === undefined) return;
            
            rowCount -= 1;
            // If searching is active then render the table with search result by callcing search function again.
            if (searchingActive) {
                this.search(searchFunction);
                return;
            }
            if (settings.pagination.active) {
                updateTableByPagination();
                return;
            }

            const rowTableDeleteIndex = rowIdsRendered.indexOf(removedRow._ROW_ID);
            rowIdsRendered.splice(rowTableDeleteIndex, 1);
            // If the removed row is not rendered on the page then skip removing.
            if (rowTableDeleteIndex !== -1)  {
                console.log(rowTableDeleteIndex);
            
                if (rowTableDeleteIndex === -1) return;

                setSelectedRow(rowTableDeleteIndex !== 0 ? rowTableDeleteIndex - 1 : 0);

                $(`#${tableId} tbody tr:eq(${rowTableDeleteIndex})`).remove();
        
                // Change the row class
                for (let i = index ; i < rowCount ; i++) {
                    const rowClass = i % 2 === 0 ? 'evenRow' : 'oddRow';
                    $(`#${tableId} tbody tr:eq(${i})`).removeClass().addClass(rowClass);
                }    
            }
            
        };
        _object.deleteRows = function(indexes) {
            const indexesToBeRemoved = indexes.filter(index => index < rowCount);
            settings.rows = settings.rows.filter((row, index) => indexesToBeRemoved.indexOf(index) === -1);
            rowCount -= indexesToBeRemoved.length;

            // If searching is active then render the table with search result by callcing search function again.
            if (searchingActive) {
                this.search(searchFunction);
                return;
            }
            if (settings.pagination.active) {
                updateTableByPagination();
                return;
            }

            $(`#${settings.tableId} tbody`).remove();
            initRows();
        };
    
        _object.selectedRow = function() {
            return selectedRow;
        };
        _object.selectedRowInModel = function() {

            return rowIndexToModel(selectedRow);
        };
        _object.selectedColumn = function() {
            return selectedColumn;
        };
        _object.getColumn = function(columnIndex) {
            return settings.columns[columnIndex];
        }
        _object.columnCount = function() {
            return columnCount;
        };
        _object.rowCount = function() {
            return rowCount;
        };
        _object.getRow = function(index) {
            return settings.rows[index];
        };
        _object.getRows = function() {
            return settings.rows;
        };
        _object.on = function(event, fn) {
            events.set(event, fn);
        };

        _object.currentPage = function() {
            return currentPage;
        };

        _object.pageCount = function() {
            return pageCount;
        };

        _object.getId = function() {
            return tableId;
        };

        _object.setLocale = function(locale) {
            tableLocale = locale;
        };

        _object.search = function(fn) {
    
            // If the function is not provided or undefined then return original rows.
            if (fn === undefined || fn === null) {
                searchResult = undefined;
                searchFunction = function(row) { return true; };
                searchingActive = false;
                $('#searchInfo').html('');
                if (settings.pagination.active) {
                    pagination.currentPage = 1;
                    updateTableByPagination();
                }
                else initRows();
                
                return settings.rows.length;
            }

            searchFunction = fn;
            searchResult = settings.rows.filter(row => fn(row));
            
            $(`#${settings.tableId} tbody`).remove();
            
            if (settings.pagination.active) {
                pagination.currentPage = 1;
                updateTableByPagination(searchResult);
            }
            else initRows(searchResult);

            searchingActive = true;
            
            if (settings.pagination.active && settings.showSearchHint)
                $('#searchInfo').html(settings.searchTipText(searchResult.length));
            
            return searchResult.length;
        };

        _object.clear = function() {
            $(`#${tableId} tbody`).empty();

            settings.rows = [];
            rowCount = 0;
            selectedRow = -1;
            selectedColumn = -1;
            selectedRowObject = undefined;
            selectedColumnObject = undefined;
            searchColumnIndex = -1;
            sortingColumnIndex = -1;
            pagination.currentPage = 1;
            pagination.numOfPages = 0;

            if (settings.pagination.active) updatePageBarInfo(settings.rows);
        };

    }
}

$.fn.FoliumTable = function(settings) {
    const tableId = this[0].id;
    
    if (settings === undefined) return this[0].foliumObject;
        
    settings.tableId = tableId;
    let foliumTable = new FoliumTable(settings, $(this));
    this[0].foliumObject = foliumTable;

    return this[0].foliumObject;
};