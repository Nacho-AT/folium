/**
 * TODO:
 */
class FoliumTable {
    
    constructor(settings, table) {
        const _object = this;

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

        function initRows(table, settings) {
            table.append('<tbody>');
            settings.rows.forEach((row, index) => {
                const rowClass = index % 2 === 0 ? 'evenRow' : 'oddRow';
                let rowHTML = `<tr class="${rowClass}">`;

                tableColumns.forEach((column, columnIndex) => {
                    const columnValue = row[column.columnId];

                    // Render the value presented from the settings.
                    const value = _object.cellRenderer(index, columnIndex, columnValue, row);
                    const tdOutput = columnValue === undefined ? '<td></td>' : `<td>${value}</td>`;
                    rowHTML += tdOutput;
                });

                rowHTML += '</tr>';
                table.append(rowHTML);
            });

            table.append('</tbody>');

            // Init selectedRowFeature
        $(`#${settings.tableId}`).on('click', 'td', function(){
            console.log('asdsad');
            const selectedRowObject = $(this).parent();
            const selectedColumnObject = $(this);

            const rowIndex = selectedRowObject.index();
            const columnIndex = selectedColumnObject.index();

            _object.selectedRow = rowIndex;
            _object.selectedColumn = columnIndex;

         });

         $(`#${settings.tableId}`).on('dblclick', 'td', function() {
            const ENTER_KEY_CODE = 13;
            if (!settings.editable) return;

             const value = $(this).text();
             const _this = $(this);
             const inputBoxWidth = _this.css('width');
             const inputBoxHeight = _this.css('height');

             _this.html(`<input type="text" id="cellEditor" style="width:${inputBoxWidth};height:${inputBoxHeight}" value="${value}" />`);
             const cellEditor = $('#cellEditor');
             cellEditor.focus();
             $('#cellEditor').focusout(function() {
                const rowIndex = _this.parent().index();
                const columnIndex = _this.index();
                const newValue = cellEditor.val();
                //TODO: Sort the array after editing...
                const columnId = settings.columns[columnIndex].columnId;
                settings.rows[rowIndex][columnId] = newValue;
                _this.html(newValue);
            });
            // If user presses enter then focus out
            $('#cellEditor').keypress(event => {
                if (event.keyCode === ENTER_KEY_CODE) $('#cellEditor').focusout();
            });

         });

        }

        function initColumns(tableColumns) {
            let columnsHTML = '<thead><tr id="columns">';
            tableColumns.forEach(column => columnsHTML += `<th class="columnHeader sortHeader" id="${column.columnId}">${column.displayText}</th>`);
            columnsHTML += "</tr>"
            
            table.append(columnsHTML + '</thead>');
        }

        this.settings = settings;
        this.table = table;
        this._selectedRow = -1;
        this._selectedColumn = -1;
        this.rowCount = settings.rows.length;
        this.columnCount = settings.columns.length;
        this.tableId = settings.tableId;
        this.selectedRowObject = undefined;
        this.selectedColumnObject = undefined;
        this.sortingTypes = new Map();
        this.columnSortingTypes = new Map();

        this.columnSortingTypes.set('number', numberSort);
        this.columnSortingTypes.set('datetime', dateSort);
        this.columnSortingTypes.set('string', stringSort);
        this.columnSortingTypes.set(undefined, stringSort);

        table.addClass('folium');
        table.attr('tabindex', '0');

        this.sortable = this.sortable === undefined ? false : this.sortable;
        this.editable = this.editable === undefined ? false : this.editable;

        this.cellRenderer = settings.cellRenderer !== undefined ? settings.cellRenderer : function(rowIndex, columnIndex, data, rowObject) { return data; };

        if (this.settings.width !== undefined) {
            const size = this.settings.width.size;
            const unit = this.settings.width.unit;
            
            $('.folium').css('width', `${size}${unit}`);
        }
        const tableColumns = this.settings.columns;
        
        // Set sorting types to ASC
        tableColumns.forEach(column => _object.sortingTypes.set(column.columnId, 1));

        // Init columns
        initColumns(tableColumns);
        
        // Init Rows
        initRows(table, this.settings);


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
         $(`#${this.tableId} th`).click(function() {
            const selectedHeaderIndex = $(this).index();
            
            if (_object.settings.sortable) {
                const columnId = _object.settings.columns[selectedHeaderIndex].columnId;
                const columnSortingType = _object.settings.columns[selectedHeaderIndex].sortingType;

                const sortingType = _object.sortingTypes.get(columnId);
                const sortFunction = _object.columnSortingTypes.get(columnSortingType);
                
                _object.settings.rows.sort((a, b) => sortingType * sortFunction(a[columnId], b[columnId]));                
                _object.sortingTypes.set(columnId, sortingType * -1);

                $(`#${_object.settings.tableId} tbody`).remove();
                initRows(_object.table, _object.settings);
            }
            
         });

         $(document).keydown(event => {
            const activeTable = $(document).attr('activeTable');
            const keyCode = event.keyCode;

            if ((activeTable === null || activeTable === undefined) && activeTable !== _object.tableId) return;

            const LEFT_ARROW_KEY_CODE = 37;
            const UP_ARROW_KEY_CODE = 38;
            const RIGHT_ARROW_KEY_CODE = 39;
            const DOWN_ARROW_KEY_CODE = 40;

            if (keyCode === LEFT_ARROW_KEY_CODE) {
                if (_object.selectedColumn <= 0) return;

                _object.selectedColumn = _object.selectedColumn - 1;
            }
            else if (keyCode === UP_ARROW_KEY_CODE) {
                if (_object.selectedRow <= 0) return;

                _object.selectedRow = _object.selectedRow - 1;
                _object.selectedColumn = _object.selectedColumn;
            }
            else if (keyCode === RIGHT_ARROW_KEY_CODE) {
                if (_object.selectedColumn === this.columnCount - 1) return;

                _object.selectedColumn = _object.selectedColumn + 1;
            }
            else if (keyCode === DOWN_ARROW_KEY_CODE) {
                if (_object.selectedRow === this.rowCount - 1) return;

                _object.selectedRow = _object.selectedRow + 1;
                _object.selectedColumn = _object.selectedColumn;
            }
            
        });

// end
    }

    addRow(rowObject) {
        this.settings.rows.push(rowObject);
        this.rowCount += 1;
        
        const rowClass = (this.rowCount - 1) % 2 === 0 ? 'evenRow' : 'oddRow';
        let rowHTML = `<tr class="${rowClass}">`;
        
        this.settings.columns.forEach((column, columnIndex) => {
            const columnValue = rowObject[column.columnId];

            // Render the value presented from the settings.
            const value = this.cellRenderer(this.rowCount - 1, columnIndex, columnValue, rowObject);
            const tdOutput = columnValue === undefined ? '<td></td>' : `<td>${value}</td>`;
            rowHTML += tdOutput;
        });

        rowHTML += '</tr>';

        $(`#${this.tableId} tr:last`).after(rowHTML);

    }

    set selectedRow(rowIndex) {
        this._selectedRow = rowIndex;
        if (this.selectedRowObject !== undefined) this.selectedRowObject.removeClass('selectedRow');
        const domRowIndex = new Number(rowIndex + 1).toString();

        this.selectedRowObject = $(`#${this.settings.tableId} tr:eq(${domRowIndex})`);
        this.selectedRowObject.focus();
        this.selectedRowObject.addClass('selectedRow');
    }

    get selectedRow() {
        return this._selectedRow;
    }

    set selectedColumn(columnIndex) {
        $(`#${this.settings.tableId} th:eq(${this._selectedColumn})`).removeClass('selectedColumnHeader');
        this._selectedColumn = columnIndex;

        if (this.selectedColumnObject !== undefined) this.selectedColumnObject.removeClass('selectedColumn');

        const domRowIndex = new Number(this.selectedRow + 1).toString();
        
        this.selectedColumnObject = $(`#${this.settings.tableId} tr:eq(${domRowIndex})`).find(`td:eq(${columnIndex})`);
        this.selectedColumnObject.addClass('selectedColumn');
        $(`#${this.settings.tableId} th:eq(${this._selectedColumn})`).addClass('selectedColumnHeader');
        this.selectedColumnObject.focus();
    }

    get selectedColumn() {
        return this._selectedColumn;
    }

}

let foliumTable = undefined;

$.fn.FoliumTable = function(settings) {
    if (settings === undefined) return foliumTable;
    settings.tableId = this[0].id;

    foliumTable = new FoliumTable(settings, this);

    return foliumTable;
}