function FoliumTable(settings, table) {

    let rowCount = settings.rows.length;
    let columnCount = settings.columns.length;
    let selectedRow = -1;
    let selectedRowObject = undefined;
    let selectedColumn = -1;
    let selectedColumnObject = undefined;
    let tableId = settings.tableId;
    let sortingColumnIndex = -1;
    let cellRenderer = undefined;

    const sortingTypes = new Map();
    const columnSortingTypes = new Map();
    

    function setSelectedRow(rowIndex) {
        if (rowIndex === -1) {
            selectedRow = -1;
            selectedRowObject = undefined;
            return;
        }
        selectedRow = rowIndex;
        if (selectedRowObject !== undefined) selectedRowObject.removeClass('selectedRow');
        const domRowIndex = new Number(rowIndex + 1).toString();

        selectedRowObject = $(`#${settings.tableId} tr:eq(${domRowIndex})`);
        selectedRowObject.focus();
        selectedRowObject.addClass('selectedRow');
    }

    function setSelectedColumn(columnIndex) {
        if (columnIndex >= columnCount) return;
        $(`#${settings.tableId} th:eq(${selectedColumn})`).removeClass('selectedColumnHeader');
        selectedColumn = columnIndex;

        if (selectedColumnObject !== undefined) selectedColumnObject.removeClass('selectedColumn');

        const domRowIndex = new Number(selectedRow + 1).toString();
        
        selectedColumnObject = $(`#${settings.tableId} tr:eq(${domRowIndex})`).find(`td:eq(${columnIndex})`);
        selectedColumnObject.addClass('selectedColumn');
        $(`#${settings.tableId} th:eq(${selectedColumn})`).addClass('selectedColumnHeader');
        selectedColumnObject.focus();
    }

    function stringSort(a, b) {
                return a.localeCompare(b);
            }
    
    function numberSort(a, b) {
        return a - b;
    }
    
    function dateSort(a, b) {
        if (a > b) return 1;
        else if (a < b) return -1;
                
        return 0;
    }

    function sortTable(columnIndex) {
        if (columnIndex === -1) return;

        if (settings.sortable) {
            const columnId = settings.columns[columnIndex].columnId;
            const columnSortingType = settings.columns[columnIndex].sortingType;

            const sortingType = sortingTypes.get(columnId);
            const sortFunction = columnSortingTypes.get(columnSortingType);
          
            settings.rows.sort((a, b) => sortingType * sortFunction(a[columnId], b[columnId]));                
            sortingTypes.set(columnId, sortingType * -1);

            $(`#${settings.tableId} tbody`).remove();
        }
        
    }

    function initColumns(tableColumns) {
        let columnsHTML = '<thead><tr id="columns">';
        tableColumns.forEach(column => columnsHTML += `<th class="columnHeader sortHeader" id="${column.columnId}">${column.displayText}</th>`);
        columnsHTML += "</tr>"
        
        table.append(columnsHTML + '</thead>');
    }

    function initRows(table, settings) {
        table.append('<tbody>');
        settings.rows.forEach((row, index) => {
            const rowClass = index % 2 === 0 ? 'evenRow' : 'oddRow';
            let rowHTML = `<tr class="${rowClass}">`;

            settings.columns.forEach((column, columnIndex) => {
                const columnValue = row[column.columnId];

                // Render the value presented from the settings.
                const value = cellRenderer(index, columnIndex, columnValue, row);
                const tdOutput = columnValue === undefined ? '<td></td>' : `<td>${value}</td>`;
                rowHTML += tdOutput;
            });

            rowHTML += '</tr>';
            table.append(rowHTML);
        });

        table.append('</tbody>');

        // Init selectedRowFeature
    $(`#${settings.tableId}`).on('click', 'td', function(){
        const selectedRowObject = $(this).parent();
        const selectedColumnObject = $(this);

        const rowIndex = selectedRowObject.index();
        const columnIndex = selectedColumnObject.index();

        setSelectedRow(rowIndex);
        setSelectedColumn(columnIndex);
     });

     $(`#${settings.tableId}`).on('dblclick', 'td', function() {
        activateCellEditor($(this));
     });

    }

    function activateCellEditor(tdObject) {
        const ENTER_KEY_CODE = 13;
        const value = tdObject.text();
        const inputBoxWidth = tdObject.css('width');
        const rowIndex = tdObject.parent().index();
        const columnIndex = tdObject.index();
            
        tdObject.html(`<input type="text" id="cellEditor" style="width:${inputBoxWidth}" value="${value}" />`);
        const cellEditor = $('#cellEditor');
        cellEditor.focus();
        $('#cellEditor').focusout(function() {
            const newValue = cellEditor.val();
            //TODO: Sort the array after editing...
            const columnId = settings.columns[columnIndex].columnId;
            settings.rows[rowIndex][columnId] = newValue;
            tdObject.html(newValue);

        });
        // If user presses enter then focus out
        $('#cellEditor').keypress(event => {
            if (event.keyCode === ENTER_KEY_CODE) {
                setSelectedColumn(columnIndex + 1);
                table.focus();
            }
    });
    }

    class FoliumTable {
    
        constructor() {
            const _object = this;
        
            columnSortingTypes.set('number', numberSort);
            columnSortingTypes.set('datetime', dateSort);
            columnSortingTypes.set('string', stringSort);
            columnSortingTypes.set(undefined, stringSort);
    
            table.addClass('folium');
            table.attr('tabindex', '0');
    
            this.cellRenderer = settings.cellRenderer !== undefined ? settings.cellRenderer : function(rowIndex, columnIndex, data, rowObject) { return data; };
            cellRenderer = this.cellRenderer;

            if (settings.width !== undefined) $('.folium').css('width', `${settings.width}`);
            
            const tableColumns = settings.columns;
            
            // Set sorting types to ASC
            tableColumns.forEach(column => sortingTypes.set(column.columnId, 1));
    
            // Init columns
            initColumns(tableColumns);
            
            // Init Rows
            initRows(table, settings);
    
    
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
                    initRows(table, settings);
                }
                
             });
    
             $(document).keydown(event => {
                const activeTable = $(document).attr('activeTable');
                const keyCode = event.keyCode;
    
                if ((activeTable === null || activeTable === undefined) && activeTable !== tableId) return;
    
                const LEFT_ARROW_KEY_CODE = 37;
                const UP_ARROW_KEY_CODE = 38;
                const RIGHT_ARROW_KEY_CODE = 39;
                const DOWN_ARROW_KEY_CODE = 40;
                const F2_KEY_CODE = 113;

                if (keyCode === LEFT_ARROW_KEY_CODE) {
                    if (selectedColumn <= 0) return;
                    
                    setSelectedColumn(selectedColumn - 1);
                }
                else if (keyCode === UP_ARROW_KEY_CODE) {
                    if (selectedRow <= 0) return;
                    
                    setSelectedRow(selectedRow - 1);
                    setSelectedColumn(selectedColumn);
                }
                else if (keyCode === RIGHT_ARROW_KEY_CODE) {
                    if (selectedColumn === columnCount - 1) return;
    
                    setSelectedColumn(selectedColumn + 1);
                }
                else if (keyCode === DOWN_ARROW_KEY_CODE) {
                    if (selectedRow === rowCount - 1) return;
                    
                    setSelectedRow(selectedRow + 1);
                    setSelectedColumn(selectedColumn);
                }

                if (keyCode === F2_KEY_CODE) {
                    activateCellEditor(selectedColumnObject);
                }
                
            });
    
    // end
        }
    
        addRow(rowObject) {
            settings.rows.push(rowObject);
    
            rowCount += 1;
            
            const rowClass = (rowCount - 1) % 2 === 0 ? 'evenRow' : 'oddRow';
            let rowHTML = `<tr class="${rowClass}">`;
            
            settings.columns.forEach((column, columnIndex) => {
                const columnValue = rowObject[column.columnId];
    
                // Render the value presented from the settings.
                const value = this.cellRenderer(rowCount - 1, columnIndex, columnValue, rowObject);
                const tdOutput = columnValue === undefined ? '<td></td>' : `<td>${value}</td>`;
                rowHTML += tdOutput;
            });
    
            rowHTML += '</tr>';

            $(`#${tableId} tr:last`).after(rowHTML);
    
        }
    
        updateRow(index, rowObject) {
    
            const rowToUpdate = settings.rows[index];
    
            Object.keys(rowObject).forEach(property => rowToUpdate[property] = rowObject[property]);
    
            let rowHTML = '';
            
            settings.columns.forEach((column, columnIndex) => {
                const columnValue = rowToUpdate[column.columnId];
    
                // Render the value presented from the settings.
                const value = this.cellRenderer(rowCount - 1, columnIndex, columnValue, rowToUpdate);
                const tdOutput = columnValue === undefined ? '<td></td>' : `<td>${value}</td>`;
                rowHTML += tdOutput;
            });
            const updateIndex = index + 1;
            $(`#${tableId} tr:eq(${updateIndex})`).html(rowHTML);
        }
    
        deleteRow(index) {
            settings.rows.splice(index, 1);
            rowCount -= 1;
            setSelectedRow(index - 1);
            const domTableRemoveIndex = index + 1;
            $(`#${tableId} tr:eq(${domTableRemoveIndex})`).remove();
    
            // Change the row class
            for (let i = index ; i < rowCount ; i++) {
                const rowClass = i % 2 === 0 ? 'evenRow' : 'oddRow';
                const updateIndex = i + 1;
    
                $(`#${tableId} tr:eq(${updateIndex})`).removeClass().addClass(rowClass);
            }
    
        }
    
        selectedRow() {
            return selectedRow;
        }

        selectedColumn() {
            return selectedColumn;
        }

        columnCount() {
            return columnCount;
        }

        rowCount() {
            return rowCount;
        }
    
    }

    return new FoliumTable();
}



let foliumTable = undefined;

$.fn.FoliumTable = function(settings) {
    if (settings === undefined) return foliumTable;
    settings.tableId = this[0].id;

    foliumTable = new FoliumTable(settings, $(this));

    return foliumTable;
}