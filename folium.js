/**
 * FoliumTable Version: 1.0.2-BETA 
 */
class FoliumTable {

    constructor(settings, table) {

        if (settings.columns === undefined) {
            console.error('"columns" property is not defined in table settings. Please make sure that it is defined in your table settings.');
            return;
        }
        else if (settings.rows === undefined) {
            console.error('"rows" property is not defined in table settings. Please make sure that it is defined in your table settings.');
            return;
        }

        const _object = this;
        let rowCount = settings.rows.length;
        let columnCount = settings.columns.length;
        let selectedRow = -1;
        let selectedRowObject = undefined;
        let selectedColumn = -1;
        let selectedColumnObject = undefined;
        let tableId = settings.tableId;
        let cellRenderer = undefined;
        let tableLocale = 'en-US';
        let searchText = '';
        let searchColumnIndex = -1;
        let sortingColumnIndex = -1;
        let rowsAsArrays = undefined;
       
        const pagination = { pageSize : -1, numOfPages : 0, currentPage : 1 };
        const sortingOrders = new Map();
        const columnSortingFunctions = new Map();
        const events = new Map();
        const dataTypeParses = new Map();
        events.set('rowClicked', function(rowIndex) {});
        events.set('rowDoubleClicked', function(rowIndex) {}); 
        
        // Set pagination object to default if it's not defined by user
        settings.pagination = settings.pagination === undefined ? {active : false, size : -1} : settings.pagination;
          settings.sortable = settings.sortable === undefined ? false : settings.sortable;
          settings.editable = settings.editable === undefined ? false : settings.editable;
         settings.searching = settings.searching === undefined ? false : settings.searching;

        function setSelectedRow(rowIndex) {
            if (rowIndex === -1) {
                selectedRow = -1;
                selectedRowObject = undefined;
                return;
            }
    
            if(tableId !== $(document).attr('activeTable')){
                return;
            }
    
            selectedRow = rowIndex;
            if (selectedRowObject !== undefined) selectedRowObject.removeClass('selectedRow');
            const domRowIndex = new Number(rowIndex + 1).toString();
    
            selectedRowObject = $(`#${tableId} tr:eq(${domRowIndex})`);
            selectedRowObject.focus();
            selectedRowObject.addClass('selectedRow');
        }
    
        function setSelectedColumn(columnIndex) {
            if (columnIndex >= columnCount) return;
    
            if(tableId !== $(document).attr('activeTable')){
                return;
            }
    
            $(`#${tableId} th:eq(${selectedColumn})`).removeClass('selectedColumnHeader');
            selectedColumn = columnIndex;
    
            if (selectedColumnObject !== undefined) selectedColumnObject.removeClass('selectedColumn');
    
            const domRowIndex = new Number(selectedRow + 1).toString();
            
            selectedColumnObject = $(`#${tableId} tr:eq(${domRowIndex})`).find(`td:eq(${columnIndex})`);
            selectedColumnObject.addClass('selectedColumn');
            $(`#${tableId} th:eq(${selectedColumn})`).addClass('selectedColumnHeader');
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
                
                const elementAccessor = rowsAsArrays ? columnIndex : columnId ;

                settings.rows.sort((a, b) => sortingType * sortFunction(a[elementAccessor], b[elementAccessor]));                
            }
            
        }
    
        function updatePageBarInfo(tableRows = settings.rows) {
            
            const numPagesMod = tableRows.length % pagination.pageSize;
            
            pagination.numOfPages = parseInt(tableRows.length / pagination.pageSize);
            pagination.numOfPages = numPagesMod !== 0 ? pagination.numOfPages + 1 : pagination.numOfPages;
    
            const pageDataStartIndex = (pagination.currentPage - 1) * pagination.pageSize + 1;
            const pageDataEndIndex = pageDataStartIndex + tableRows.slice((pagination.currentPage - 1) * pagination.pageSize, pagination.currentPage * pagination.pageSize).length - 1;
    
            $(`#${tableId}pageInfo`).val(`${pageDataStartIndex}-${pageDataEndIndex} | Page: ${pagination.currentPage}/${pagination.numOfPages}`);
        }
    
        function updateTableByPagination(tableRows = settings.rows) {
                 
            $(`#${settings.tableId} tbody`).remove();
            initRows(tableRows);
            updatePageBarInfo(tableRows);
        }
    
        function initColumns(tableColumns) {
            let columnsHTML = '<thead><tr id="columns">';
            tableColumns.forEach(column => columnsHTML += `<th class="columnHeader sortHeader" id="${column.columnId}">${column.displayText}</th>`);
            columnsHTML += "</tr>"
            
            table.append(columnsHTML + '</thead>');
        }
    
        function initRows(tableRows = settings.rows) {
            table.append('<tbody>');
            let rows = settings.pagination.active ? tableRows.slice((pagination.currentPage - 1) * pagination.pageSize, pagination.currentPage * pagination.pageSize) : tableRows;
            let rowsHTML = '';

            rows.forEach((row, index) => {
                const rowClass = index % 2 === 0 ? 'evenRow' : 'oddRow';
                let rowHTML = `<tr class="${rowClass}">`;
    
                settings.columns.forEach((column, columnIndex) => {
                    let columnValue = undefined;

                    if (rowsAsArrays) columnValue = row[columnIndex];
                    else columnValue = row[column.columnId];
                    
                    // Render the value presented from the settings.
                    const value = cellRenderer(index, columnIndex, columnValue, row);
                    const tdOutput = columnValue === undefined ? '<td></td>' : `<td>${value}</td>`;
                    rowHTML += tdOutput;
                });
    
                rowHTML += '</tr>';
                rowsHTML += rowHTML;
            });

            table.append(rowsHTML);
            table.append('</tbody>');
    
        $(`#${tableId}`).on('click', 'td', function(){
            const selectedRowObject = $(this).parent();
            const selectedColumnObject = $(this);
    
            const rowIndex = selectedRowObject.index();
            const columnIndex = selectedColumnObject.index();
    
            setSelectedRow(rowIndex);
            setSelectedColumn(columnIndex);
            events.get('rowClicked')(rowIndex);
         });
    
         $(`#${settings.tableId} td`).dblclick(function() {
            const selectedRowObject = $(this).parent();
            const rowIndex = selectedRowObject.index();
    
            activateCellEditor($(this));
            events.get('rowDoubleClicked')(rowIndex);
         });
        }
    
        function activateCellEditor(tdObject) {

            const ENTER_KEY_CODE = 13;
            const inputBoxWidth = tdObject.css('width');
            const rowIndex = tdObject.parent().index();
            const columnIndex = tdObject.index();
            const columnId = settings.columns[columnIndex].columnId;
            const value = rowsAsArrays ? settings.rows[rowIndex][columnIndex] : settings.rows[rowIndex][columnId];

            if (!settings.editable) return;

            tdObject.html(`<input type="text" id="cellEditor" style="width:${inputBoxWidth}" value="${value}" />`);
            const cellEditor = $('#cellEditor');
            cellEditor.focus();
            cellEditor[0].setSelectionRange(value.length, value.length);
            $('#cellEditor').focusout(function() {
                let newValue = cellEditor.val();
                
                // Parse the new value according to column data type.
                newValue = dataTypeParses.get(settings.columns[columnIndex].dataType)(newValue);
                
                if (rowsAsArrays) settings.rows[rowIndex][columnIndex] = newValue;
                else settings.rows[rowIndex][columnId] = newValue;

                const valueRendered = cellRenderer(rowIndex, columnIndex, newValue, settings.rows[rowIndex]);

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

        this.cellRenderer = settings.cellRenderer !== undefined ? settings.cellRenderer : function(rowIndex, columnIndex, data, rowObject) { return data; };
        cellRenderer = this.cellRenderer;

        if (settings.width !== undefined) $('.folium').css('width', `${settings.width}`);
        if (settings.height !== undefined) $('.folium').css('height', `${settings.height}`);
        
        const tableColumns = settings.columns;
        
        // Set sorting orders to ASC
        tableColumns.forEach(column => sortingOrders.set(column.columnId, -1));

        // Init columns
        initColumns(tableColumns);
                
        // If pagination is active then set up the pagination settings.
        if (settings.pagination.active && typeof settings.pagination.size === 'number') {
            
            $(`#${tableId}`).before(`<div class="foliumPageBar"><button id="${tableId}foliumPageFirst" class="pageBarButton">First</button><button class="pageBarButton" id="${tableId}foliumPagePrevious"><</button><input type="text" id="${tableId}pageInfo" class="infoBox" readonly /><button class="pageBarButton" id="${tableId}foliumPageNext">></button><button class="pageBarButton" id="${tableId}foliumPageLast">Last</button></div>`);
            $('.foliumPageBar').css('width', $(`#${tableId}`).css('width'));
            pagination.pageSize = settings.pagination.size;
            updatePageBarInfo();
            
            // Switch to the next page                
            $(`#${tableId}foliumPageNext`).click(() => {
                if (pagination.currentPage + 1 > pagination.numOfPages) return;
                
                pagination.currentPage++;
                updateTableByPagination();
            });
            $(`#${tableId}foliumPagePrevious`).click(() => {
                if (pagination.currentPage - 1 < 1) return;
                
                pagination.currentPage--;
                updateTableByPagination();
            });
            $(`#${tableId}foliumPageFirst`).click(() => {
                if (pagination.currentPage === 1) return ; 
                pagination.currentPage = 1;
                updateTableByPagination();
            });
            $(`#${tableId}foliumPageLast`).click(() => {
                if (pagination.currentPage === pagination.numOfPages) return ;
                pagination.currentPage = pagination.numOfPages;
                updateTableByPagination();
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
         $(`#${tableId} th`).click(function() {
            const selectedHeaderIndex = $(this).index();
            sortingColumnIndex = selectedHeaderIndex;

            if (settings.sortable) {
                sortTable(selectedHeaderIndex);
                $(`#${settings.tableId} tbody`).remove();
                initRows();
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
            settings.rows.push(rowObject);
            rowCount += 1;
            // If searching is active then render the table with search result by calling search function again.
            if (searchText !== '') {
                this.search(searchText, searchColumnIndex);
                return;
            }
            
            if (sortingColumnIndex !== -1) {
                sortTable(sortingColumnIndex, false);
            }

            if (settings.pagination.active) {
                updateTableByPagination();
                return;
            }
            
            const rowClass = (rowCount - 1) % 2 === 0 ? 'evenRow' : 'oddRow';
            let rowHTML = `<tr class="${rowClass}">`;
            
            settings.columns.forEach((column, columnIndex) => {
                const columnValue = rowsAsArrays ? rowObject[columnIndex] : rowObject[column.columnId];
    
                // Render the value presented from the settings.
                const value = cellRenderer(rowCount - 1, columnIndex, columnValue, rowObject);
                const tdOutput = columnValue === undefined ? '<td></td>' : `<td>${value}</td>`;
                rowHTML += tdOutput;
            });
    
            rowHTML += '</tr>';

            const lastRowIndex = $(`#${tableId} tbody tr:last`).index();

            if (lastRowIndex === -1) $(`#${tableId} tbody`).html(rowHTML);
            else $(`#${tableId} tbody tr:last`).after(rowHTML);
    
        };
        _object.addRows = function(rows) {
            settings.rows = settings.rows.concat(rows);
            //rowCount += rows.length;

            if (searchText !== '') {
                this.search(searchText, searchColumnIndex);
                return;
            }

            if (sortingColumnIndex !== -1) {
                sortTable(sortingColumnIndex, false);
            }

            if (settings.pagination.active) {
                updateTableByPagination();
                return;
            }
            let rowsHTML = '';

            rows.forEach(rowObject => {
                const rowClass = (rowCount - 1) % 2 === 0 ? 'evenRow' : 'oddRow';
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
            });
            
            const lastRowIndex = $(`#${tableId} tbody tr:last`).index();

            if (lastRowIndex === -1) $(`#${tableId} tbody`).html(rowsHTML);
            else $(`#${tableId} tbody tr:last`).after(rowsHTML);

        };
    
        _object.updateRow = function(index, rowObject) {
    
            const rowToUpdate = settings.rows[index];
            
            if (rowsAsArrays) Object.keys(rowObject).forEach(property => {
                const columnIndexToUpdate = settings.columns.map(column => column.columnId).indexOf(property);
                rowToUpdate[columnIndexToUpdate] = rowObject[property];
            });
            else Object.keys(rowObject).forEach(property => rowToUpdate[property] = rowObject[property]);
            let rowHTML = '';
            
            settings.columns.forEach((column, columnIndex) => {
                const columnValue = rowsAsArrays ? rowToUpdate[columnIndex] : rowToUpdate[column.columnId];
    
                // Render the value presented from the settings.
                const value = this.cellRenderer(rowCount - 1, columnIndex, columnValue, rowToUpdate);
                const tdOutput = columnValue === undefined ? '<td></td>' : `<td>${value}</td>`;
                rowHTML += tdOutput;
            });
            let updateIndex = index + 1;
            if (settings.pagination.active) {
                const startRange = (pagination.currentPage - 1) * pagination.pageSize;
                const endRange = pagination.currentPage * pagination.pageSize - 1;
                // if the updated row index is present in the current page, then update 
                if (index >= startRange && index <= endRange){
                    updateIndex = index - startRange + 1; // +1 for omitting header
                    $(`#${tableId} tr:eq(${updateIndex})`).html(rowHTML);
                } 
                
            }
            else $(`#${tableId} tr:eq(${updateIndex})`).html(rowHTML);
        };
        _object.updateRows = function(indexes, rows) {
            for (let i = 0 ; i < indexes.length ; i++) {
                this.updateRow(indexes[i], rows[i]);
            }
        };
    
        _object.deleteRow = function(index) {
            settings.rows.splice(index, 1);
            rowCount -= 1;
            // If searching is active then render the table with search result by callcing search function again.
            if (searchText !== '') {
                this.search(searchText, searchColumnIndex);
                return;
            }
            if (settings.pagination.active) {
                updateTableByPagination();
                return;
            }
            setSelectedRow(index - 1);
            const domTableRemoveIndex = index + 1;
            $(`#${tableId} tr:eq(${domTableRemoveIndex})`).remove();
    
            // Change the row class
            for (let i = index ; i < rowCount ; i++) {
                const rowClass = i % 2 === 0 ? 'evenRow' : 'oddRow';
                const updateIndex = i + 1;
    
                $(`#${tableId} tr:eq(${updateIndex})`).removeClass().addClass(rowClass);
            }
    
        };
        _object.deleteRows = function(indexes) {
            indexes.forEach(index => this.deleteRow(index));
        };
    
        _object.selectedRow = function() {
            return selectedRow;
        };
        _object.selectedRowInModel = function() {
            if (settings.pagination.active) return (pagination.currentPage - 1) * pagination.pageSize  + selectedRow;
        
            return selectedRow;
        };
        _object.selectedColumn = function() {
            return selectedColumn;
        };
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

        _object.search = function(value, columnIndex = -1) {
            
            if (!settings.searching) {
                console.error('Searching is not enabled for this table! You can enable searching by defining searching property as true for the table settings.');
                return;
            };

            searchText = value;
            let searchResult = null;
            
            if (rowsAsArrays) {
                if (columnIndex !== -1) searchResult = settings.rows.filter(row => row[columnIndex].toLowerCase(tableLocale).includes(value.toLowerCase(tableLocale))); 
                else searchResult = settings.rows.filter(row => Object.values(row).join(';').toLowerCase(tableLocale).includes(value.toLowerCase(tableLocale)));
            }
            else {
                if (columnIndex !== -1) searchResult = settings.rows.filter(row => row[settings.columns[columnIndex].columnId].toLowerCase(tableLocale).includes(value.toLowerCase(tableLocale))); 
                else searchResult = settings.rows.filter(row => Object.values(row).join(';').toLowerCase(tableLocale).includes(value.toLowerCase(tableLocale)));
            }
            
            $(`#${settings.tableId} tbody`).remove();
            
            if (settings.pagination.active) {
                pagination.currentPage = 1;
                updateTableByPagination(searchResult);
            }
            else initRows(searchResult);
            
            return searchResult.length;
        };

// end
    }

}

$.fn.FoliumTable = function(settings) {
    const tableId = this[0].id;
    
    if (settings === undefined) return this[0].foliumObject;
        
    settings.tableId = tableId;
    let foliumTable = new FoliumTable(settings, $(this));
    this[0].foliumObject = foliumTable;

    return this[0].foliumObject;
}