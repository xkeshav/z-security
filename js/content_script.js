(function() {
    'use strict';

    let WHOIS_API_KEY,
        WHOIS_API_ENDPOINT,
        PHISHTANK_API_KEY,
        PHISHTANK_API_ENDPOINT;

    const ipPattern = /(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/g;
    const urlPattern = /(http(s)?:\/\/.)?(www\.)?([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}/g;
    const INVALID_DOMAIN_SUFFIX = [
        'apk',
        'exe',
        'bat',
        'cgi',
        'exe',
        'jar',
        'wsf',
        'py',
        'sh',
        'swift',
        'java',
        'cpp',
        'vb',
        'class',
        'bak',
        'dll',
        'ini',
        'tmp',
        'ink',
        'cur',
        'msi',
        'sys',
        'dmp',
        'cpl',
        'icns',
        'drv',
        'cfg',
        'csv',
        'sql',
        'mdb',
        'xml',
        'dat',
        'sav',
        'key',
        'ppt',
        'pptx',
        'pps',
        'odp',
        'wpd',
        'rtf',
        'pdf',
        'fnt',
        'fon',
        'otf',
        'ttf',
        'psd',
        'svg',
        'tiff',
        'png',
        'jpeg',
        'jpg',
        'bmp',
        'gif',
        'ico',
        'mkv',
        'mp4',
        'mp3',
        'flv',
        'avi',
        'm4v',
        'mpg',
        'mpeg',
        'swf',
        'rm',
        'vob',
        'wmv',
        'dat',
        'ogg',
        'wav',
        'bin',
        'dmg',
        'iso',
        'pptx',
        'docx',
        'doc',
        'xlr',
        'xls',
        'xlsx',
        'ods',
        'dbf',
        'zip',
        'tar',
        'pkg',
        'rar',
        'rpm',
        'tar.gz',
        'rss',
        'part',
        '7z',
        'tex',
        'wps',
        'test',
        'css',
        'js',
        'html',
        'json',
        'txt',
        'xhtml',
        'htm',
        'php',
        'asp',
        'jsp',
        'log',
        'cfm',
        'cer',
        'aspx'
    ];

    chrome.runtime.onMessage.addListener((request) => {
        const sidePanelExists = document.getElementById('zcake-cbe');
        if (sidePanelExists) {
            document.body.removeChild(sidePanelExists);
        } else {
            createSidePanel();
            if (request.cmd === 'journey-map') {
                let tabHistory = [];
                if (request.history.length > 0) {
                    tabHistory = getTabHistory(request.history);
                }
                doStuffWithDOM(request.tabURL, tabHistory, request.hop_id);
            }
        }
    });

    const fetchPrivateData = (what) => {
        const configFile = chrome.runtime.getURL('config');
        return fetch(configFile)
            .then((response) => {
                if (!response.ok) throw Error(response.statusText);
                return response.json();
            })
            .then((responseAsJson) => {
                if (!responseAsJson[what]) throw Error('not found');
                return responseAsJson[what];
            });
    };

    fetchPrivateData('WHOIS_API').then((data) => {
        WHOIS_API_KEY = data.KEY;
        WHOIS_API_ENDPOINT = data.ENDPOINT;
    });

    fetchPrivateData('PHISHTANK_API').then((data) => {
        PHISHTANK_API_KEY = data.KEY;
        PHISHTANK_API_ENDPOINT = data.ENDPOINT;
    });

    // common methods
    const createElement = (type, className, idName) => {
        let elem = document.createElement(type);
        if (className) elem.className = className;
        if (idName) elem.id = idName;
        return elem;
    };
    const uniqueArray = (array) => [...new Set(array)];
    const guid = () => {
        let s4 = () =>
            Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        return `awk_${s4() + s4()}`; // id must start with alphabets
    };
    const toLowerCase = (str) => str.toLowerCase();
    const filterUrl = (url) => /^[a-z0-9]/i.test(url);

    const excludeDomain = (arr) => {
        return !INVALID_DOMAIN_SUFFIX.some((e) => arr.includes(e));
    };
    // add prefix http if not exist and then get hostname
    const makeReadableUrl = (url) => {
        try {
            return new URL(url.startsWith('http') ? url : `http://${url}`)
                .hostname;
        } catch (e) {
            return false;
        }
    };
    // @param long st: start time; @param long et: end time
    const calculateTimeDiff = (st, et) => {
        if (st > et) [st, et] = [et, st];
        let diff_ms = et - st;
        diff_ms = diff_ms / 1000;
        let seconds = Math.abs(diff_ms % 60);
        diff_ms = diff_ms / 60;
        let minutes = Math.floor(diff_ms % 60);
        diff_ms = diff_ms / 60;
        let hours = Math.floor(diff_ms % 24);
        let days = Math.floor(diff_ms / 24);
        let diffString = ` ${days ? `${days}d` : ``}
                           ${hours ? `${hours}h` : ``}
                           ${minutes ? `${minutes}m` : ``}
                           ${seconds ? `${+seconds.toFixed(2)}s` : `0s`}
                        `;
        return diffString;
    };

    // create side Panel
    const createSidePanel = () => {
        const sidePanelDiv = createElement('div', 'zcake-cbe', 'zcake-cbe');
        const header = createElement(
            'header',
            'zcake-cbe__header',
            'zcake-header'
        );
        sidePanelDiv.appendChild(header);
        const figure = createElement('figure');
        header.appendChild(figure);
        const image = createElement('img');
        image.src = chrome.runtime.getURL('icons/header-logo.svg');
        figure.appendChild(image);
        const bottomToTop = createElement(
            'div',
            'zcake__scroll-to-top',
            'zcake-cbe-scroll-to-top'
        );
        bottomToTop.setAttribute('title', 'Go to top');
        bottomToTop.innerHTML = '<i>&#x2191;</i>';
        bottomToTop.onclick = scrollToTop;
        sidePanelDiv.appendChild(bottomToTop);
        document.body.appendChild(sidePanelDiv);
    };

    const getTabHistory = (history_data) => {
        let output = [];
        if (history_data.length > 0) {
            history_data.map((data, i) => {
                let hostname = data.hostname;
                let href = data.href;
                let startTime = data.startTime;
                let endTime = history_data[i + 1]
                    ? history_data[i + 1].startTime
                    : new Date().getTime();
                let params = decodeURIComponent(data.search);
                let id = data.id;
                output.push({ hostname, href, startTime, endTime, params, id });
            });
            return output;
        } else {
            return output;
        }
    };

    const doStuffWithDOM = async (url, timeline, hop_id) => {
        try {
            const sidePanel = document.getElementById('zcake-cbe');
            // tab panel
            const tabPanel = createElement(
                'div',
                'zcake-cbe__tab-panel',
                'zcake-cbe__tab-panel'
            );
            sidePanel.appendChild(tabPanel);
            // tab data panel
            const tabDataPanel = createElement(
                'div',
                'zcake-cbe__tab-data',
                'zcake-cbe__tab-data'
            );
            sidePanel.appendChild(tabDataPanel);

            // domain tab
            const tabDomain = createElement(
                'div',
                'zcake-cbe__tab zcake-cbe__active',
                'zcake-cbe__tab-domain'
            );
            tabDomain.innerHTML =
                '<span class="zcake-cbe__tab-title" >Content Info</span>';
            tabDomain.onclick = toggleTab;
            tabPanel.appendChild(tabDomain);
            const domainData = await createDomainDiv(url);
            tabDataPanel.appendChild(domainData);
            document.querySelector('#zcake-total-ip').onclick = scrollToIpList;
            // timeline tab
            if (timeline.length > 0) {
                const tabTimeline = createElement(
                    'div',
                    ' zcake-cbe__tab zcake-cbe__inactive',
                    'zcake-cbe__tab-timeline'
                );
                tabTimeline.innerHTML =
                    '<span class="zcake-cbe__tab--title">Journey Map</span>';
                tabTimeline.onclick = toggleTab;
                tabPanel.appendChild(tabTimeline);
                const timelineData = await createTimelineDiv(
                    timeline.reverse(),
                    hop_id
                );
                tabDataPanel.appendChild(timelineData);
            }
        } catch (e) {
            console.error('There is error while DOM development', e);
        }
    };

    const scrollToTop = (e) => {
        e.stopPropagation();
        // Scroll to a certain element
        document.querySelector('#zcake-header').scrollIntoView({
            behavior: 'smooth'
        });
    };

    const scrollToIpList = (e) => {
        e.stopPropagation();
        // Scroll to a certain element
        document.querySelector('#ip-list').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    };

    const toggleTab = (e) => {
        e.stopPropagation();
        const target =
            e.target !== e.currentTarget ? e.target.parentNode : e.target;
        const tab_domain = document.getElementById('zcake-cbe__tab-domain');
        const tab_timline = document.getElementById('zcake-cbe__tab-timeline');
        const domain_data = document.getElementById('zcake-cbe__data-domain');
        const timeline_data = document.getElementById(
            'zcake-cbe__data-timeline'
        );
        switch (target.id) {
            case 'zcake-cbe__tab-timeline':
                tab_domain.classList.replace(
                    'zcake-cbe__active',
                    'zcake-cbe__inactive'
                );
                tab_timline.classList.replace(
                    'zcake-cbe__inactive',
                    'zcake-cbe__active'
                );
                domain_data.classList.replace('zcake__show', 'zcake__hide');
                timeline_data.classList.replace('zcake__hide', 'zcake__show');
                break;
            case 'zcake-cbe__tab-domain':
            default:
                tab_domain.classList.replace(
                    'zcake-cbe__inactive',
                    'zcake-cbe__active'
                );
                if (tab_timline)
                    tab_timline.classList.replace(
                        'zcake-cbe__active',
                        'zcake-cbe__inactive'
                    );
                domain_data.classList.replace('zcake__hide', 'zcake__show');
                if (timeline_data)
                    timeline_data.classList.replace(
                        'zcake__show',
                        'zcake__hide'
                    );
        }
    };

    const createDomainDiv = async (url) => {
        const domainDiv = createElement(
            'div',
            'zcake__show',
            'zcake-cbe__data-domain'
        );

        let pageContent = await collectPageContent();
        let urlList = await collectUrlFromContent(pageContent);
        let ipList = await collectIpFromContent(pageContent);
        let infoDiv = `<div class="zcake-cbe__info-panel">
                <div> <b>Current URL:</b> <span class="zcake-cbe__word-break">${
                    new URL(url).hostname
                }</span></div>
                <div> <b>Last updated:</b> ${new Date().toLocaleString()}</div>
                <div> <a href="javascript:void(0)">Total Domains:</a> ${parseInt(
                    urlList.length,
                    10
                )}</div>
                <div > <a href="javascript:void(0)" id="zcake-total-ip">Total IPs:</a> ${parseInt(
                    ipList.length,
                    10
                )}</div>

                </div>`;
        domainDiv.insertAdjacentHTML('beforeend', infoDiv);
        if (urlList.length > 0) {
            let urlListDiv = await createListDiv(urlList, 'domain-list');
            domainDiv.appendChild(urlListDiv);
        }
        if (ipList.length > 0) {
            let ipListDiv = await createListDiv(ipList, 'ip-list');
            domainDiv.appendChild(ipListDiv);
        }

        return domainDiv;
    };

    const collectPageContent = async () => document.body.innerText;

    const collectIpFromContent = async (content) => {
        const ipRegex = new RegExp(ipPattern);
        let ipList = content.match(ipRegex);
        let uniqueIpList = uniqueArray(ipList);
        return uniqueIpList;
    };

    const collectUrlFromContent = async (content) => {
        const urlRegex = new RegExp(urlPattern);
        let urlList = content.match(urlRegex);
        if (urlList)
            urlList = urlList
                .map(toLowerCase)
                .filter(filterUrl)
                .filter(excludeDomain)
                .map(makeReadableUrl);
        let uniqueUrlList = uniqueArray(urlList);
        return uniqueUrlList;
    };

    // @param string what = "ip-list" || "domain-list"
    const createListDiv = async (list, what = 'ip-list') => {
        const listDiv = createElement('div', `zcake-cbe__${what}`, what);
        let divTitle = `<p class="list-heading">${what
            .replace('-', ' ')
            .toUpperCase()} </p>`;

        listDiv.innerHTML = divTitle;
        let listContent = await createListContent(list);
        listDiv.appendChild(listContent);
        return listDiv;
    };

    // create div with complete list of IP/URL
    const createListContent = async (list) => {
        let docFrag = document.createDocumentFragment();
        let counter = 1;
        for (let i in list) {
            let div = await createInnerDiv(list[i], counter++);
            docFrag.appendChild(div);
        }
        return docFrag;
    };

    // create individual IP/URL div with unique ID
    const createInnerDiv = async (item) => {
        const innerDiv = createElement('div', 'zcake-cbe__inner-div', guid());

        innerDiv.innerHTML = `<div class="zcake-accordion">
                            <div class="zcake-accordion__label">
                                <label class="zcake-cbe__word-break">${item}</label>
                                <span class="zcake-accordion__expand"></span>
                            </div>
                            <div class="zcake-accordion__detail"></div>
                        </div>`;
        return innerDiv;
    };
    // timeline tab
    const createTimelineDiv = async (tl, hop_id) => {
        const timelineDiv = createElement(
            'div',
            'zcake__hide',
            'zcake-cbe__data-timeline'
        );
        var unique = [...new Set(tl.map((l) => l.hostname))];

        let sum = 0;
        for (let t in tl) {
            let x = tl[t];
            let diff = x.endTime - x.startTime;
            sum += diff;
        }
        const totalTimeSpent = calculateTimeDiff(0, sum);
        let totalHops = parseInt(tl.length, 10);
        let totalHosts = parseInt(unique.length, 10);
        let infoDiv = `<div class="zcake-cbe__info-panel">
                        <div><b>Summary</b>:<br/> <i>${totalTimeSpent}</i> with <i>${totalHops}</i> hop(s) on <i>${totalHosts}</i> host(s).</div>
                    </div>`;
        timelineDiv.insertAdjacentHTML('beforeend', infoDiv);
        let timeLine = await createTimeLine(tl, hop_id);
        timelineDiv.appendChild(timeLine);
        return timelineDiv;
    };

    const createTimeLine = async (timeline_list, hop_id) => {
        let timelineList = createElement('ul', 'zcake__timeline-list');
        let listTitle = `<p class="list-heading">Timeline</p>`;
        timelineList.innerHTML = listTitle;
        let listContent = await createTimeLineList(timeline_list, hop_id);

        timelineList.appendChild(listContent);
        return timelineList;
    };

    const createTimeLineList = async (list, hop_id) => {
        let docFrag = document.createDocumentFragment();
        // let currentNode = list[0].id;
        let currentNode = hop_id;
        for (let i in list) {
            let item = await createTimeListItem(list[i], currentNode);
            docFrag.appendChild(item);
        }
        return docFrag;
    };

    // individual timeline block
    const createTimeListItem = async (item, current_node_id) => {
        let spendTime = calculateTimeDiff(item.startTime, item.endTime);

        //Iterate the search parameters.
        const searchParams = new URLSearchParams(item.params);
        let param_list = `<ul class="zcake__query-list">`;
        let counter = 0;
        for (let p of searchParams) {
            param_list += `<li><b>${p[0]}</b>: ${p[1]}</li>`;
            counter++;
        }
        param_list += `</ul>`;
        if (counter == 0) {
            param_list = `-`;
        }
        let timeLineClass = 'zcake__timeline-item';
        if (item.id == current_node_id) {
            timeLineClass = 'zcake__timeline-item-active';
        }
        const innerDiv = createElement('li', timeLineClass);
        innerDiv.addEventListener('click', function(e) {
            if (e.target.classList.contains('zcake__nav-link')) {
                let link = e.target.dataset.navLink;
                let hopId = e.target.dataset.hopId;
                chrome.runtime.sendMessage(
                    { command: 'linked', hopId: hopId },
                    () => (window.location = link)
                );
            }
            e.target.classList.toggle('zcake__timeline-highlight');
            e.target.children[0].classList.toggle('zcake__hide');
            e.stopPropagation();
        });

        innerDiv.setAttribute(
            'date-is',
            new Date(item.startTime).toLocaleString()
        );
        innerDiv.innerHTML = `<ul class="zcake__timeline-detail zcake__hide" >
                                <li><div><b>Hostname:</b> ${
                                    item.hostname
                                }</div></li>
                                <li><div ><b class="zcake__nav-link" data-nav-link="${
                                    item.href
                                }" data-hop-id="${
            item.id
        }" >Query: </b> ${param_list}</div></li>
                                <li><div><b>Dwell Time:</b> ${spendTime}</div></li>
                              </ul>`;
        return innerDiv;
    };

    const fetchFromWhois = async (url) => {
        const whois_url = `${WHOIS_API_ENDPOINT}?apiKey=${WHOIS_API_KEY}&domainName=${url}&outputFormat=JSON`;
        const init = {
            method: 'GET',
            headers: new Headers(),
            mode: 'cors',
            cache: 'default'
        };
        return fetch(whois_url, init)
            .then((response) => {
                if (!response.ok) {
                    throw Error(response.statusText);
                }
                return response.json();
            })
            .then((json) => {
                if (json.ErrorMessage) {
                    return {
                        error: `<div class="zcake-cbe__error">${
                            json.ErrorMessage.msg
                        }</div>`
                    };
                } else if (json.WhoisRecord) {
                    if (json.WhoisRecord.dataError) {
                        return {
                            error: `<div class="zcake-cbe__error">Data Missing</div>`
                        };
                    } else {
                        return { data: json.WhoisRecord };
                    }
                }
            })
            .catch((err) => {
                console.error('error', err);
            });
    };

    const fetchFromPhishTank = async (url) => {
        const postdata = {
            url: encodeURI(url),
            format: 'json',
            app_key: PHISHTANK_API_KEY
        };
        const fd = new FormData();
        for (let pd of Object.entries(postdata)) {
            fd.append(pd[0], pd[1]);
        }
        const opts = {
            method: 'POST',
            body: fd,
            mode: 'cors',
            cache: 'default'
        };
        return fetch(PHISHTANK_API_ENDPOINT, opts)
            .then((response) => {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    return response.json();
                }
                throw new TypeError('Invalid Response from API.');
            })
            .then((json) => {
                if (json && json.results) {
                    return { data: json.results };
                }
            })
            .catch(() => {
                return {
                    error: `<div class="zcake-cbe__error">Data Missing</div>`
                };
            });
    };

    // display separate details of IP
    const buildDetailPanel = {
        domain: (record) => {
            let html = `<dd>`;

            if (record.domainName)
                html += `<div><b>Domain Name: </b>${record.domainName}</div>`;
            if (record.registrarName)
                html += `<div><b>Registrar: </b>${record.registrarName}</div>`;
            if (record.createdDate)
                html += `<div><b>Registration Date: </b>${
                    record.createdDate
                }</div>`;
            if (record.updatedDate)
                html += `<div><b>Updated Date: </b>${record.updatedDate}</div>`;
            if (
                record.expiresDate ||
                (record.registryData && record.registryData.expiresDate)
            ) {
                let expiresDate =
                    record.expiresDate || record.registryData.expiresDate;
                html += `<div><b>Expiration Date: </b>${expiresDate}</div>`;
            }
            if (
                record.nameServers ||
                (record.registryData && record.registryData.nameServers)
            ) {
                let nameServers =
                    record.nameServers || record.registryData.nameServers;
                html += `<div><b>Name Servers: </b>`;
                if (
                    nameServers instanceof Object &&
                    nameServers.hostNames instanceof Array
                ) {
                    html += `<ul>`;
                    nameServers.hostNames.map((h) => (html += `<li>${h}</li>`));
                    html += `</ul>`;
                } else {
                    html += `${nameServers}`;
                }
                html += `<div>`;
            }
            if (record.contactEmail)
                html += `<div><b>Contact Email: </b>${
                    record.contactEmail
                }</div>`;
            html += `</dd>`;
            return html;
        },
        registrant: (record) => {
            let html = `<dd>`;

            if (record.name)
                html += `<div> <b>Name: </b> ${record.name} </div>`;
            if (record.organization)
                html += `<div> <b>Organization: </b> ${
                    record.organization
                } </div>`;
            if (record.street1)
                html += `<div> <b>Street: </b> ${record.street1} </div>`;
            if (record.street2)
                html += `<div> <b>Street 2: </b> ${record.street2} </div>`;
            if (record.city)
                html += `<div> <b>City: </b> ${record.city} </div>`;
            if (record.state)
                html += `<div> <b>State: </b> ${record.state} </div>`;
            if (record.postalCode)
                html += `<div> <b>Postal Code: </b> ${
                    record.postalCode
                } </div>`;
            if (record.country)
                html += `<div> <b>Country: </b> ${record.country} </div>`;
            if (record.telephone)
                html += `<div> <b>Phone: </b> ${record.telephone} </div>`;
            if (record.fax) html += `<div> <b>Fax: </b> ${record.fax} </div>`;
            if (record.email)
                html += `<div> <b>Email: </b> ${record.email} </div>`;
            html += `</dd>`;
            return html;
        },
        administrative: (record) => {
            let html = `<dd>`;

            if (record.name) html += `<div><b>Name: </b> ${record.name}</div>`;
            if (record.organization)
                html += `<div><b>Organization: </b> ${
                    record.organization
                }</div>`;
            if (record.street1)
                html + `<div><b>Street: </b>${record.street1}</div>`;
            if (record.street2)
                html += `<div><b>Street 2: </b>${record.street2}</div>`;
            if (record.city) html += `<div><b>City: </b>${record.city}</div>`;
            if (record.state)
                html += `<div><b>State: </b>${record.state}</div>`;
            if (record.postalCode)
                html += `<div><b>Postal Code: </b>${record.postalCode}</div>`;
            if (record.country)
                html += `<div><b>Country: </b>${record.country}</div>`;
            if (record.telephone)
                html += `<div><b>Phone: </b>${record.telephone}</div>`;
            if (record.fax) html += `<div><b>Fax: </b>${record.fax}</div>`;
            if (record.email)
                html += `<div><b>Email: </b>${record.email}</div>`;
            html += `</dd>`;
            return html;
        },
        technical: (record) => {
            let html = `<dd>`;

            if (record.name) html += `<div> <b>Name: </b>${record.name}</div>`;
            if (record.organization)
                html += `<div> <b>Organization: </b>${
                    record.organization
                }</div>`;
            if (record.street1)
                html += `<div> <b>Street: </b>${record.street1}</div>`;
            if (record.street2)
                html += `<div> <b>Street 2: </b>${record.street2}</div>`;
            if (record.city) html += `<div> <b>City: </b>${record.city}</div>`;
            if (record.state)
                html += `<div> <b>State: </b>${record.state}</div>`;
            if (record.postalCode)
                html += `<div> <b>Postal Code: </b>${record.postalCode}</div>`;
            if (record.country)
                html += `<div> <b>Country: </b>${record.country}</div>`;
            if (record.telephone)
                html += `<div> <b>Phone: </b>${record.telephone}</div>`;
            if (record.fax) html += `<div> <b>Fax: </b>${record.fax}</div>`;
            if (record.email)
                html += `<div> <b>Email: </b>${record.email}</div>`;

            html += `</dd>`;
            return html;
        },
        phishtank: (record) => {
            let html = `<dd>`;
            if (record.in_database) {
                html += `<div> <b>URL: </b>${record.url}</div>
                        <div> <b>Phish ID: </b>${record.phish_id}</div>
                        <div> <b>Phish Detail Page: </b><a href=${
                            record.phish_detail_page
                        } target="_blank">${record.phish_detail_page}</a></div>
                        <div> <b>Is valid: </b>${
                            record.valid ? 'Yes' : 'No'
                        }</div>
                        <div> <b>Verified: </b>${
                            record.verifed ? 'Yes' : 'No'
                        }</div>`;
                if (record.verifed_at) {
                    html += `<div> <b>Verified at: </b>${
                        record.verified_at
                    }</div>`;
                }
            } else {
                html += `<div> No data found. </div>`;
            }
            html += `</dd>`;
            return html;
        }
    };

    const displayDetailPanel = (data) => {
        let html = `<dl >`;
        const whoIsData = data.whois;
        const phishTankData = data.phishtank;
        if (whoIsData && Object.keys(whoIsData).length > 0) {
            html += `<dt > Domain Information </dt> ${buildDetailPanel.domain(
                whoIsData
            )}`;
            if (whoIsData.registrant || whoIsData.registryData.registrant) {
                let registryData =
                    whoIsData.registrant || whoIsData.registryData.registrant;
                html += `<dt > Registrant Contact </dt> ${buildDetailPanel.registrant(
                    registryData
                )}`;
            }
            if (
                whoIsData.administrativeContact ||
                whoIsData.registryData.administrativeContact
            ) {
                let administrativeData =
                    whoIsData.administrativeContact ||
                    whoIsData.registryData.administrativeContact;
                html += `<dt> Administrative Contact </dt> ${buildDetailPanel.administrative(
                    administrativeData
                )}`;
            }
            if (
                whoIsData.technicalContact ||
                whoIsData.registryData.technicalContact
            ) {
                let technicalData =
                    whoIsData.technicalContact ||
                    whoIsData.registryData.technicalContact;
                html += `<dt> Technical Contact </dt> ${buildDetailPanel.technical(
                    technicalData
                )}`;
            }
        }
        if (phishTankData && Object.keys(phishTankData).length > 0) {
            html += `<dt> PhishTank Data </dt> ${buildDetailPanel.phishtank(
                phishTankData
            )}`;
        }
        html += `</dl>`;
        return html;
    };

    const showDetail = async (t) => {
        let target = t;
        let detail_panel = target.children[1];
        if (detail_panel && detail_panel.innerText.length === 0) {
            let ip = target.innerText.trim();
            const finalData = {};
            try {
                target.classList.add('zcake-accordion__spinner');
                // whois integration
                const whois = await fetchFromWhois(ip);
                if (whois.error) {
                    detail_panel.innerHTML = whois.error;
                } else if (whois.data) {
                    Object.assign(finalData, { whois: whois.data });
                    if (
                        target.parentNode.parentNode.getAttribute('id') ===
                        'domain-list'
                    ) {
                        // phishtank integration
                        let url = `http://www.${ip}`;
                        const phishtank = await fetchFromPhishTank(url);
                        if (phishtank.error) {
                            detail_panel.innerHTML = phishtank.error;
                        } else if (phishtank.data) {
                            Object.assign(finalData, {
                                phishtank: phishtank.data
                            });
                        }
                    }
                }
            } catch (err) {
                target.classList.remove('zcake-accordion__spinner');
                console.error('error while displaying detail', err);
            }
            const urlInfo = displayDetailPanel(finalData);
            detail_panel.insertAdjacentHTML('beforeend', urlInfo);
            target.children[0].children[1].classList.replace(
                'zcake-accordion__expand',
                'zcake-accordion__collapse'
            );
            if (detail_panel.style.maxHeight) {
                detail_panel.style.maxHeight = null;
            } else {
                detail_panel.style.maxHeight = detail_panel.scrollHeight + 'px';
            }
            target.classList.remove('zcake-accordion__spinner');
        }
    };

    const hideDetail = (t) => {
        let target = t;
        target.children[0].children[1].classList.replace(
            'zcake-accordion__collapse',
            'zcake-accordion__expand'
        );
        target.children[1].style.display = 'none';
    };

    document.addEventListener(
        'click',
        (event) => {
            let target = event.target;
            if (
                event.target.parentNode.classList.contains('zcake-accordion') ||
                event.target.parentNode.classList.contains(
                    'zcake-accordion__label'
                )
            ) {
                if (
                    event.target.parentNode.classList.contains(
                        'zcake-accordion__label'
                    )
                ) {
                    // if clicked on the +/- icon
                    target = event.target.parentNode.parentNode;
                }
                let labelChildren = target.children[0];
                let detailChidren = target.children[1];
                if (
                    labelChildren.children[1].classList.contains(
                        'zcake-accordion__expand'
                    )
                ) {
                    if (detailChidren && detailChidren.innerHTML === '') {
                        showDetail(target);
                    } else {
                        labelChildren.children[1].classList.replace(
                            'zcake-accordion__expand',
                            'zcake-accordion__collapse'
                        );
                        detailChidren.style.display = 'block';
                        return;
                    }
                }
                if (
                    labelChildren.children[1].classList.contains(
                        'zcake-accordion__collapse'
                    )
                ) {
                    hideDetail(target);
                }
            }
        },
        false
    );
})();
