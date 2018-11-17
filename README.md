# ZSECURITY

Z Security - Chrome Browser Extension

Displays domain & IP details as well as journey map of a particular browser tabs based on user's browsing history.

### Install

-   Download the code zip and extract into a directory on your system.
-   Open chrome and Visit `chrome://extensions` ( type in address bar )
-   Ensure that the _Developer mode_ checkbox in the top right-hand corner is checked.
-   Click _Load unpacked extension…_ and navigate to the directory in which your extension files was extracted, and select this directory.

---

##

On click of extension icon, a window will be open on right hand side as a panel.this panel will contain 2 tabs and details.

-   extension detail will be displayed on top as header , here you can add image.
-   extension body will contain 2 tabs named as _Content Info_ and _Journey Map_ By default _Content Info_ will be open and displayed if you have not navigated any page so far.
-   If you navigate to one of the given website than _Journey Map_ tab will also appears near _Content Info_

following are the detail of tabs which will be visible

## Content Info

-   Open browser and visit any page, then click on the extension icon from the extemnsion area, on right beside of the address bar.
-   It will open a side panel on right side of the page.
-   This side panel will scan all IP addresses & domain/URL found on the current open page and create a list under 2 header _DOMAIN LIST_ and _IP LIST_
-   Click on any item (url/ip) of the list, it will expand and there will be accordion of following information in below order.

    -   Domain Information
    -   Registrant Contact
    -   Administrative Contact
    -   Technical Contant
    -   PhishTank data (for url)

-   Click on the url/ip to toggle the display of details
-   CLick on extension icon to close the side bar.

### Journey Map

-   We are using browser's IndexeDB to store the tab history data.
-   In journey map tab, on top there is info panel which summarize the total dwell time with total hops and total number of hosts visited on that particular tab.
-   Below the info panel, a vertical timeline is displayed which has all the visited hops in descending order (recent url is on top) and start time is labelled near to the hops.
-   On click on any hops on timeline, it will expand and display details such as hostname, complete url address, dwell time, query params list ( if any).
-   You can go navigate to the page on click of the URL link under any hops.
-   Once the tab is closed it's data will be removed automatically.
-   followings are the domains for which we are tracking and developing journey maps
    -   github.com
    -   stackoverflow.com
    -   google.com
    -   medium.com,
    -   google.co.in
-   we hide the journey map tab excluding the above domain lists.

# Example url to test

-   https://free-proxy-list.net/
-   https://stripe.com/docs/ips
-   https://bit.do/list-of-url-shorteners.php
-   http://5000best.com/websites/
-   https://support.office.com/en-us/article/Office-365-URLs-and-IP-address-ranges-8548a211-3fe7-47cb-abb1-355ea5aa88a2

## Screenshots

[IP Detail](ss/id.png?raw=true 'Domain Info')

[Side Panel](ss/sp.png?raw=true 'Detail')

[Time Line](ss/tl.png?raw=true 'Journey Map')

## Requirement

-   chrome _v 58_ or higher
-   Internet connectivity

## Reference

https://developer.chrome.com/extensions/getstarted#unpacked

## Notes

-   Currently we are using whois API to fetch the detail which has daily limit of accessing Ip detail. and user can get error _"Access restricted due to the subscription limitation."_
-   Some IP information contains special characters (for eg. ��) which is returnd by the API, so we display as it is.
-   In journey map, we are showing time in seconds with precision of 2 decimal points in dwell time. Sometimes there might be slight diffrence is total time displaying in summary.

## Known Issues

-   If page content reloaded without refresh (ajax loaded data) than it is suggested to reopen the extension to retrieve latest information.
-   As we are using regex to parse url from page, although this regex cover most of the case but could be failed on some occasion, it could be optimized further. For example, currently it takes file names as URL.
-   Sometimes whois api gives response object in rawtext instead of object. that We are not handling for now.
