(function() {
    'use strict';

    const indexedDB = window.indexedDB;
    const DB_NAME = 'zcake-history-idb';
    const DB_VERSION = 1001;
    const DB_STORE_NAME = 'zcake-tab-history';
    const ALLOWED_HOSTNAME = [
        'stackoverflow.com',
        'github.com',
        'google.com',
        'google.co.in',
        'medium.com'
    ];
    let activeTabs = {}; // store recent URL with a tab ID in {tab_id:tab_url} format
    let network_error = false;
    var db;
    let doTrack = true;
    chrome.runtime.onMessage.addListener(function(
        request,
        sender,
        sendResponse
    ) {
        if (request.command == 'linked') {
            doTrack = false;
            if (sender.tab.id && request.hopId)
                setLocalStorage(sender.tab.id, request.hopId);
            sendResponse(true);
        } else {
            doTrack = true;
        }
    });

    chrome.browserAction.setTitle({ title: 'Zcake CBE' });

    chrome.browserAction.onClicked.addListener(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            fetchTabHistory(tabs[0].id, async (historyData) => {
                db.close();
                let hop_id = await getLocalStorage(tabs[0].id);
                chrome.tabs.sendMessage(tabs[0].id, {
                    cmd: 'journey-map',
                    tabURL: tabs[0].url,
                    history: historyData,
                    hop_id: hop_id
                });
            });
        });
    });

    // get enumerabale properties of URL object and copy each ; @param url string
    const getURLProperties = async (tab_url) => {
        let props = {};
        let url = new URL(tab_url);
        props.hash = url.hash;
        props.host = url.host;
        props.hostname = url.hostname;
        props.href = url.href;
        props.origin = url.origin;
        props.pathname = url.pathname;
        props.port = url.port;
        props.protocol = url.protocol;
        props.search = url.search;
        return props;
    };

    const openDB = () => {
        let request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onsuccess = () => {
            db = request.result;
        };
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            db.onerror = (event) =>
                console.error(
                    'Error while excessing IndexedDB!',
                    event.target.errorCode
                );
            let store = event.target.result.createObjectStore(DB_STORE_NAME, {
                keyPath: 'id',
                autoIncrement: true
            });
            store.createIndex('by_tabid', 'tabId', { unique: false });
            store.createIndex('by_hostname', 'hostname', { unique: false });
        };
    };

    const saveTabHistory = (data) => {
        let request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onsuccess = () => {
            db = request.result;
            let tx = db.transaction(DB_STORE_NAME, 'readwrite');
            let store = tx.objectStore(DB_STORE_NAME);
            let result = store.add(data);
            tx.oncomplete = () => {
                setLocalStorage(data.tabId, result.result);
                db.close();
            };
            tx.onerror = (error) =>
                console.error(
                    'save transaction not opened due to error: ',
                    error
                );
        };
    };

    const fetchTabHistory = (tab_id, oncompleted) => {
        let tabHistory = [];
        let request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onsuccess = () => {
            db = request.result;
            let tx = db.transaction(DB_STORE_NAME, 'readonly');
            let store = tx.objectStore(DB_STORE_NAME);
            let keyRangeValue = IDBKeyRange.only(tab_id);
            let index = store.index('by_tabid');
            index.openCursor(keyRangeValue).onsuccess = (event) => {
                let cursor = event.target.result;
                if (cursor) {
                    if (
                        ALLOWED_HOSTNAME.includes(
                            cursor.value.hostname.replace('www.', '')
                        )
                    ) {
                        tabHistory.push(cursor.value);
                    }
                    cursor.continue();
                }
            };
            tx.oncomplete = () => oncompleted(tabHistory);
            tx.onerror = (error) =>
                console.error(
                    'fetch transaction not opened due to error: ',
                    error
                );
        };
    };

    const removeTabHistory = (tab_id) => {
        let request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onsuccess = () => {
            db = request.result;
            let tx = db.transaction(DB_STORE_NAME, 'readwrite');
            let store = tx.objectStore(DB_STORE_NAME);
            let keyRangeValue = IDBKeyRange.only(tab_id);
            let index = store.index('by_tabid');
            index.openCursor(keyRangeValue).onsuccess = (event) => {
                let cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };
            tx.oncomplete = () => {
                db.close();
                delete activeTabs[tab_id];
            };
            tx.onerror = (error) =>
                console.error(
                    'remove transaction not opened due to error',
                    error
                );
        };
    };

    const setLocalStorage = (tab_id, hop_id) => {
        if (typeof Storage !== 'undefined') {
            // Store
            localStorage.setItem(tab_id, hop_id);
        }
    };

    const getLocalStorage = async (tab_id) => {
        if (tab_id && typeof Storage !== 'undefined') {
            return localStorage.getItem(tab_id);
        }
        return false;
    };

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status == 'complete' && tab.status == 'complete') {
            let alreadyExists = Object.entries(activeTabs).find(
                (t) => t[0] == tabId
            );
            // check reload action
            if (!alreadyExists || alreadyExists[1] != tab.url) {
                let urlObject = new URL(tab.url);
                // leave out chrome internal pages to store in db
                if (
                    urlObject.protocol !== 'chrome:' &&
                    urlObject.protocol !== 'chrome-extension:'
                ) {
                    if (!network_error) {
                        getURLProperties(tab.url).then((result) => {
                            let tabData = Object.assign({}, result, {
                                tabId: tabId,
                                startTime: new Date().getTime()
                            });
                            if (doTrack) {
                                saveTabHistory(tabData);
                            } else {
                                doTrack = !doTrack;
                            }
                            Object.assign(activeTabs, {
                                [tabId]: tab.url
                            });
                        });
                    }
                }
            }
        }
    });

    // in case of network error or offline
    chrome.webNavigation.onErrorOccurred.addListener((navObject) => {
        if (navObject.frameId === 0) {
            network_error = true;
            db.close();
        }
    });

    chrome.webNavigation.onBeforeNavigate.addListener(() => {
        network_error = false;
        openDB();
    });
    chrome.webNavigation.onCompleted.addListener(() => {
        openDB();
    });
    // remove closed tab data
    chrome.tabs.onRemoved.addListener((tabId) => removeTabHistory(tabId));
})();
