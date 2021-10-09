let db;
let budgeteerVerison;

// Create a new db request for a "budget" database.
const request = indexedDB.open('BudgeteerDB', budgeteerVerison || 21);

request.onupgradeneeded = function (e) {
  console.log('Upgrade needed.');

  const { oldVersion } = e;
  const newVersion = e.newVersion || db.version;

  console.log(`DB Updated from version ${oldVersion} to ${newVersion}`);

  db = e.target.result;

  if (db.objectStoreNames.length === 0) {
    db.createObjectStore('LocalBudgeteer', { autoIncrement: true });
  }
};

request.onerror = function (e) {
  console.log(`Woops! ${e.target.errorCode}`);
};

function checkDatabase() {
  console.log('check db invoked');

  // Open a transaction on your LocalBudgeteer db
  let transaction = db.transaction(['LocalBudgeteer'], 'readwrite');

  // access your LocalBudgeteer object
  const store = transaction.objectStore('LocalBudgeteer');

  // Get all records from store and set to a variable
  const getAll = store.getAll();

  // If the request was successful
  getAll.onsuccess = function () {
    // If there are items in the store, we need to bulk add them when we are back online
    if (getAll.result.length > 0) {
      fetch('/api/transaction/bulk', {
        method: 'POST',
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
        },
      })
        .then((response) => response.json())
        .then((res) => {
          // If our returned response is not empty
          if (res.length !== 0) {
            // Open another transaction to LocalBudgeteer with the ability to read and write
            transaction = db.transaction(['LocalBudgeteer'], 'readwrite');

            // Assign the current store to a variable
            const currentStore = transaction.objectStore('LocalBudgeteer');

            // Clear existing entries because our bulk add was successful
            currentStore.clear();
            console.log('Clearing store 🧹');
          }
        });
    }
  };
}

request.onsuccess = function (e) {
  console.log('success');
  db = e.target.result;

  // Check if app is online before reading from db
  if (navigator.onLine) {
    console.log('Backend online! 🗄️');
    checkDatabase();
  }
};

const saveRecord = (record) => {
  console.log('Save record invoked');
  // Create a transaction on the LocalBudgeteer db with readwrite access
  const transaction = db.transaction(['LocalBudgeteer'], 'readwrite');

  // Access your LocalBudgeteer object store
  const store = transaction.objectStore('LocalBudgeteer');

  // Add record to your store with add method.
  store.add(record);
};

// Listen for app coming back online
window.addEventListener('online', checkDatabase);