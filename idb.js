var cost = {};

window.indexedDB = window.indexedDB ||
    window.mozIndexedDB ||
    window.webkitIndexedDB ||
    window.msIndexedDB;

if (!window.indexedDB) {
    console.log("Your browser doesn't support a stable version of IndexedDB.")
} else {
    console.log("Your browser supports a stable version of IndexedDB.")
}

cost.db;
var request = window.indexedDB.open("costDB", 2);

request.onerror = function(event) {
    console.log("error: ");
};

request.onsuccess = function(event) {
    cost.db = request.result;
    console.log("success: " + cost.db);
}

request.onupgradeneeded = function(event) {
    console.log("Upgrading or creating a new database...");

    var db = event.target.result;
    if (db.objectStoreNames.contains("cost")) {
        console.log("Deleting old object store...");
        db.deleteObjectStore("cost");
    }

    console.log("Creating new object store with autoIncrement...");
    var objectStore = db.createObjectStore("cost", {autoIncrement: true});
    console.log("Object store created:", objectStore);
}

// Function to add an entry to the CostDB
function addCostEntry(entry) {
    return new Promise((resolve, reject) => {
        var transaction = cost.db.transaction(["cost"], "readwrite");
        var store = transaction.objectStore("cost");
        var request = store.add(entry);

        request.onsuccess = () => {
            console.log("Entry added successfully with ID:", request.result);
            resolve(request.result);
        };

        request.onerror = () => {
            console.error("Error adding entry:", request.error);
            reject(request.error);
        };
    });
}

function fetchCostData(selectedYear, selectedMonth) {
    return new Promise((resolve, reject) => {
        // Map month names to their numerical values
        const monthMap = {
            'January': '01', 'February': '02', 'March': '03', 'April': '04', 'May': '05', 'June': '06',
            'July': '07', 'August': '08', 'September': '09', 'October': '10', 'November': '11', 'December': '12'
        };
        // Open a transaction on the costDB database
        var transaction = cost.db.transaction(["cost"], "readonly");
        var store = transaction.objectStore("cost");

        // Retrieve all records from the store
        var request = store.getAll();

        request.onsuccess = () => {
            var data = request.result;
            // Filter records based on selectedYear and selectedMonth
            var filteredData = data.filter(entry => {
                var entryDateComponents = entry.Date.split('-');
                var entryYear = entryDateComponents[1];
                var entryMonth = entryDateComponents[0];
                // Handle both numerical and textual month representations
                var monthValue = monthMap[selectedMonth] || selectedMonth;
                return entryYear == selectedYear && (entryMonth == monthValue || entryMonth == selectedMonth);
            });

            // Sort the filtered records by Date
            var sortedData = filteredData.sort((a, b) => {
                var dateA = new Date(a.Date), dateB = new Date(b.Date);
                return dateA - dateB; // Ascending order
            });

            // Resolve the promise with the sorted data
            resolve(sortedData);
        };

        request.onerror = () => {
            console.error("Error fetching data from IndexedDB:", request.error);
            reject(request.error);
        };
    });
}

function updateReportTable() {
    var selectedYear = document.getElementById('year').value;
    var selectedMonth = document.getElementById('month').options[document.getElementById('month').selectedIndex].text;

    if(selectedYear && selectedMonth) {
        fetchCostData(selectedYear, selectedMonth).then(data => {
            // Clear existing table rows
            var tbody = document.querySelector('table tbody');
            tbody.innerHTML = '';

            // Populate table with filtered and sorted data
            data.forEach(entry => {
                var row = tbody.insertRow();
                var categoryCell = row.insertCell();
                categoryCell.textContent = entry.category;

                var costCell = row.insertCell();
                costCell.textContent = entry.cost;

                var descriptionCell = row.insertCell();
                descriptionCell.textContent = entry.Description;

                var dateCell = row.insertCell();
                dateCell.textContent = entry.Date;
            });
        }).catch(error => {
            console.error("Failed to update report table", error);
            // Handle the error, maybe show a message to the user
        });
    }
}

// Event listeners for the dropdown changes
document.getElementById('year').addEventListener('change', updateReportTable);
document.getElementById('month').addEventListener('change', updateReportTable);


// Handling form submission
document.getElementById('costForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the form from submitting the traditional way

    // Retrieve form data
    var category = document.getElementById('categorySelect').value;
    var costValue = document.getElementById('costInput').value;
    var description = document.getElementById('descriptionInput').value;

    // Get the current date and extract the month and year
    var currentDate = new Date();
    var month = currentDate.getMonth() + 1; // getMonth() returns 0-11
    var year = currentDate.getFullYear();

    // Format month and year to ensure they are in MM-YYYY format
    var datetime = `${month.toString().padStart(2, '0')}-${year}`;

    // Construct the entry object with Month and Year
    var entry = {
        category: category,
        cost: costValue,
        Description: description,
        Date: datetime // Add the formatted month and year to the entry
    };

    // Add the entry to the database
    addCostEntry(entry).then((id) => {
        console.log("Entry added to the database with id:", id);
        // You can clear the form or provide any feedback to the user here
    }).catch((error) => {
        console.error("Failed to add the entry to the database", error);
        // Handle the error, maybe show a message to the user
    });
});