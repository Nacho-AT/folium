# Folium NodeJS BETA
Folium Table, A jQuery table plugin that powers NodeJS desktop applications by providing easy-to-use HTML tables.

![tableGif](https://raw.githubusercontent.com/cemozden/folium/master/readme_pics/table.gif)

***
## Features
* [x] Search table by either the full table data or specific column index
* [x] Sorting by columns in ascending/descending order
* [x] Dynamic Editable Data
* [x] Dynamic Pagination Module
* [x] Defining intense width, height size for your window size
* [x] Defining custom cell renderers for table cells
* [x] Adding, Updating, Removing table rows, columns
* [x] Table events (Some events haven't implemented yet)
* [x] Setting custom locales for specific languages
* [x] Navigating on tables with arrow keys
* [x] Scrollable table body
***

## Defining Table Settings

### Minimal required properties
```html
<head>
<link rel="stylesheet" type="text/css" href="folium.css">
<script src="jquery.js"></script>
<script src="folium.min.js"></script>
</head>
<body>
<!-- Defining the table as empty table. -->
<table id="foliumTableId"></table>
...
</body>
```
```javascript
const tableSettings = {
  //Required
        columns : [
                    {columnId : "username", displayText  : "Username"},
                    {columnId : "name", displayText  : "Name"},
                    {columnId : "surname", displayText  : "Surname"},
                    {columnId : "emailAddress", displayText  : "E-mail Address"},
                    {columnId : "age", displayText  : "Age", dataType : 'integer'},
                    {columnId : "phoneNumber", displayText  : "Phone Number"},
                    {columnId : "nationality", displayText  : "Nationality"},
                    {columnId : "location", displayText  : "Location"}
                  ],
  //Not Required but this will be the initial row model for the table.
        rows: [
                {username: 'jsmith', name : "John", surname : "Smith", emailAddress : 'foo@bar.com', age : 30, phoneNumber : '+1 111 111 111', nationality : 'American', location : 'San Francisco/CA'},
                {username: 'jasmith', name : "Jane", surname : "Smith", emailAddress : '', age : 29, phoneNumber : '', nationality : '', location : ''},
                {username: 'asatou', name : "Airi", surname : "Satau", emailAddress : 'asatau@bar.com', age : 33, phoneNumber : '+1 111 111 111', nationality : 'American', location : 'San Francisco/CA'}
              ]
    };

// Inject Folium functionality to the HTML table by providing its id.
$('#foliumTableId').FoliumTable(tableSettings);

```

Minimal requirement of initializing Folium Table is to provide an object that possesses columns property. ***columns*** property is an array of objects that define the columns of the table. A column object must have "**columnId**" that defines particular identity of the column as well as "**displayText**" that will be presented on the table header. An optional property **dataType** is to define the data type of the column. Available data types are *number*, *float*, *integer*, *datetime* as well as *string*. The default data type is *string*.  

***rows*** property is an optional property which is an array of row objects in which defines initial rows of the table. A row object must have properties that match the column ids defined in **columns** array. Rows can be defined as array as well. In order to activate this functionality, ***rowsAsArrays*** must be defined.

### Define rows as arrays

There is a feasible way to define rows as arrays. To do that, ***rowsAsArray*** property must be set to **true**.

```javascript
const tableSettings = {
  ...
  rows : [['jsmith', "John", "Smith", 'foo@bar.com', 30, '+1 111 111 111', 'American', 'San Francisco/CA'],
                ['jasmith', "Jane", "Smith", '', 29, '', '', ''],
                ['asatou', "Airi", "Satau", 'asatau@bar.com', 33, '+1 111 111 111', 'American', 'San Francisco/CA']],
  rowsAsArray : true
};

const myFoliumTable = $('#foliumTableId').FoliumTable();

// Add rows by providing array(s) of primitive data.
myFoliumTable.addRow(['mweiss', "Michael", "Weiss", 'michaelweiss@foobar.com', 25, '+1 111 111 111', 'American', 'San Francisco/CA']);
myFoliumTable.addRows([[/*row data 1*/], [/*row data 2*/]]);

```

### Accessing FoliumTable Object

When a Folium Table is initialized, It provides its functionalities in an object. This object can be assigned by calling FoliumTable plugin function without parameters.

```javascript
let myFoliumTable = $('#foliumTableId').FoliumTable();

// Search for John text in the table.
myFoliumTable.search('John');
```

### Pagination

![pagination](https://raw.githubusercontent.com/cemozden/folium/master/readme_pics/pagination.png)

Table pagination can be activated by assigning an object for the **pagination** property of the table settings. Folium generates pagination bar on top of the table to navigate through pages. It generates First, Previous, Next and Last page buttons. Pagination bar is supported with pagination information box regarding which page is currently presented, how many pages exist etc. 

```javascript
const tableSettings = {
  ...
  // active property must be set to true to show the pagination bar
  // size property is to set how many entries will be presented in each pages.
  pagination : {active : true, size : 10},
};
```

### Sortable table

By default, Folium tables are not sortable. In order to activate sorting, ***sortable*** parameter must be defined and assigned to "**true**".
```javascript
const tableSettings = {
  ...
  sortable : true
};
``` 
To sort the table, clicking the table header will sort the table in ascending, descending order. Sorting types for columns can be defined by specifying data type in columns definitions.

### Searching table

Folium Table supports searching by providing ***search(fn)*** function. Since Folium's approach is for designing desktop application tables. It does not create a search input box by default. It lets programmers to decide how they want to use this functionality. 

**fn(row)** parameter is a function that returns boolean for searching on the table. ***row*** parameter represents each row defined in the model. **fn** function will be called for each row while searching in the model. When it returns *true*, the **row** defined in the model will be filtered and presented in the search result set otherwise the row will not be evaluated at all. When search(fn) function succeeds, it renders the table with the filtered result and returns the number of filtered rows.  
If pagination is active, An information message regarding searching is presented on the pagination bar.

```html
<input type="text" id="nameSearchBox" />
```

```javascript
const foliumTable = $('#foliumTableId').FoliumTable();

// Search the table after searchBox (ex: input box) input text is updated.

$('#nameSearchBox').change(function(){
    const searchBoxText = $('#nameSearchBox').val();

    foliumTable.search(function(row) {
      // Search for rows which has John value in its name field.
      return row.name.includes('John');
    });

});
```

#### How to disable the search hint on the pagination bar?

![searchHint](https://raw.githubusercontent.com/cemozden/folium/master/readme_pics/search_hint.png)

By default, The search hint is presented on pagination bar, In order to disable it, The ***showSearchHint*** parameter must be set to false in the table settings.

```javascript
const tableSettings = {
...
showSearchHint : false
};
```

#### How to define custom search tip text?

By default, The search hint is presented on pagination bar as the default value "(numberOfRows) rows presented." In order to change this behaviour, ***searchTipText(numRowsFiltered)*** function could be implemented in table settings. *numRowsFiltered* represents the number of rows filtered of the search result.

```javascript
const tableSettings = {
...
  searchTipText : function(numRowsFiltered) {
      const nameSearchBoxVal = $('#nameSearchBox').val();
      return `Search results for  "${nameSearchBoxVal}" presented according to <span style="font-weight: bold;">Name</span> column.`;
  }
};
```

### Editable table

Tables are not editable by default. In order to make tables editable, The **editable** property must be defined into the table settings and set to **true**.

```javascript
const tableSettings = {
  ...
  editable : true
};
``` 

### Setting fix width and height of the table

To set the specific width, height size, **width** and **height** properties must be defined into table settings.

```javascript
const tableSettings = {
  ...
  width : '500px', // Set table width to 500px
  height : '150px' // Set table height to 150px
};
```

### Cell Rendering

![cellRendering](https://raw.githubusercontent.com/cemozden/folium/master/readme_pics/cellrenderer.png)

For the sake of presenting our table data better, We might be supposed to render table cells in a different format. For Instance, we might want to add links, input objects and other html objects into our table cells. To achieve that, We can provide a cell renderer function and assign the function to **cellRenderer** property of the table settings object. cellRenderer function is being called for each cell during the table rendering. The function has to have 4 parameters provided
(rowIndex, columnIndex, data, rowObject)
* *rowIndex*: The row index of the cell that is being rendered at the moment.
* *columnIndex*: The column index of the cell that is being rendered at the moment.
* *data*: The cell data from the rows model for the cell that is being rendered.
* *rowObject*: The row object defined in rows model for the row that is being rendered at the moment.

```javascript
const tableSettings = {
  ...
  rows : [{firstColumn : 'First column data', secondColumn : 'Second column data', linkUrl : 'github.com/cemozden/folium', forthColumn : 'Click me!'}]
  /* Render the 4th column cells as hyperlinks, render other cells as their default text from the model.
     We suppose that "Click me!" text is provided in table row objects */ 
  cellRenderer : function(rowIndex, columnIndex, data, rowObject) {
            if (columnIndex === 3) 
              return `<a href="${rowObject.linkUrl}">${data}</a>`;

            return data;
        }
};
```

### Header Rendering
![headerRendering](https://raw.githubusercontent.com/cemozden/folium/master/readme_pics/headerrenderer.png)   

Folium allows programmers to change how to render the headers of the table. This feature is pretty similar to cell rendering with only one difference. The rendering function consists of 3 parameters.

* *columnIndex*: The column index of the header that is being rendered at the moment.
* *displayText*: The display text of the header which is defined in the table settings.
* *columnObject*: The column object defined in columns model for the column that is being rendered at the moment.

### Adding, Updating, Removing Rows

Folium supports adding new rows by calling **addRow(rowObject)** function. It renders the table automatically after the *rowObject* is added into the row model.

```javascript
let myFoliumTable = $('#foliumTableId').FoliumTable();

myFoliumTable.addRow({username: 'asatou', name : "Alan", surname : "Watts", emailAddress : 'awatts@foobar.com', age : 58, phoneNumber : '+1 111 111 111', nationality : 'British', location : 'California/USA'});

// Add multiple rows by calling addRows(rowObjectArray)
myFoliumTable.addRows([{username: 'asatou', name : "Alan", surname : "Watts", emailAddress : 'awatts@foobar.com', age : 58, phoneNumber : '+1 111 111 111', nationality : 'British', location : 'California/USA'}]);

```
To update the existing rows, **updateRow(index, rowObject)** function could be used as the following.

```javascript
let myFoliumTable = $('#foliumTableId').FoliumTable();

// Update the username of first row as newUsername.
myFoliumTable.updateRow(0, {username: 'newUsername'});

/* Update multiple rows by calling updateRows(indexes, rows)
   indexes is an array of indexes to be updated
   rows variable is an array of row to be updated
   First element of the indexes matches with the first element of rows variable
*/
myFoliumTable.updateRows([0, 1], [{username: 'newNickname1'}, {username : 'newNickname2'}]);

// If rowsAsArray is true, then the whole row array must be passed.
myFoliumTable.updateRow(0, ['jsmith', 'John', 'Smith', 'foo@bar.com', 45, '+1 111 111 111','American', 'San Francisco/CA']);

myFoliumTable.updateRows([0, 1], [['jsmith', 'John', 'Smith', 'foo@bar.com', 45, '+1 111 111 111','American', 'San Francisco/CA'], ['jasmith', "Jane", "Smith", '', 29, '', '', '']]); 

```

To delete the existing rows **deleteRow(index)** method could be used as the following

```javascript
let myFoliumTable = $('#foliumTableId').FoliumTable();

// Delete the first row of the table.
myFoliumTable.deleteRow(0);

// Delete multiple rows
myFoliumTable.deleteRows([1, 2]);
```

### Accessible Table Properties
Folium provides programmers table state information by the following methods

* ***selectedRow()***: returns the selected row index on the current page if no row selected, it returns -1.
* ***selectedRowInModel()*** returns the selected row index according to the table model. In case of pagination active, this function should be used to receive the exact row index in the model.
* ***selectedColumn()***: returns the selected column index if no columns selected, it returns -1.
* ***getColumn(columnIndex)***: returns the column object defined in the columns model using *column index*.
* ***columnCount()***: returns the number of columns defined in the table.
* ***rowCount()***: returns the number of rows in the table.
* ***getRow(index)***: returns the row from the model according to the index parameter.
* ***getRows()***: returns the model of the table.
* ***currentPage()***: returns the current page number of the table in case of pagination is active.
* ***getId()***: returns the id of the table.

### Clearing table
In order to clear the table, ***clear()*** method can be used. clear method will clear the table model as well as render the table as an empty table.

```javascript
let myFoliumTable = $('#foliumTableId').FoliumTable();

myFoliumTable.clear();
```

### Events
Folium is supporting only 2 events for now which are row click and row double click events. More events will be coming up in the next releases. To manipulate the events, **on()** method is used.

```javascript
let myFoliumTable = $('#foliumTableId').FoliumTable();

// Row click event.
myFoliumTable.on('rowClicked', rowIndex => {
  console.log(`Table row clicked! Clicked Row Index: ${rowIndex}`);
});

//Row double click event.
myFoliumTable.on('rowDoubleClicked', rowIndex => {
  console.log(`Table row double clicked! Clicked Row Index: ${rowIndex}`);
});

```
### Localization

In order to be able to search and sort for strings in Folium Table, Localization could be specified by calling **setLocale(languageTag)** function. The *languageTag* parameter should be in BCP 47 language tag. For more information and examples please check the following link: https://www.techonthenet.com/js/language_tags.php

```javascript
let myFoliumTable = $('#foliumTableId').FoliumTable();

myFoliumTable.setLocale('tr-TR'); // Setting localization to Turkish language. 
```

The default locale is US English language.

### Issues, Pull Requests
For any issues, please raise an issue on GitHub page. Any pull requests are appreciated!