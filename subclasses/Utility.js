class Utility {

    /**
     * Escape HTML characters in a string
     * @param {string} str
     * @returns {string}
     */
    static escapeHtml(str) {
        return str
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    /**
     * Convert seconds to milliseconds
     * @param {int} s 
     * @returns {int} ms
     */
    static convertSecondsToMilliseconds(s) {
        return s * 1000;
    }

    /**
     * Simplified method for creating a div
     * @param {Object} options
     * @param {string} options.content Content (innerHTML)
     * @param {string} options.classes Classes (None by default)
     * @param {object} options.attributes Attributes (None by default, format: {attribute: value, ...})
     * @param {string} options.textColor Text color (By default inherit from CSS)
     * @param {HTMLElement} options.parent Parent element (By default no element)
     * @returns {HTMLDivElement} Div instance
     */
    static createDiv({content = "", classes = "", attributes = {}, textColor = "", parent = undefined}) {
        const div = document.createElement("div");
        div.className = classes;
        
        // Add attributes
        if (Object.keys(attributes).length > 0) {
            for (const [key, value] of Object.entries(attributes)) {
                if (key == undefined || value == undefined) {
                    continue;
                }

                div.setAttribute(key, value);
            }
        }

        if (textColor !== "") div.style.color = textColor;
        if (content !== "") div.innerHTML = content;
        if (parent != undefined) parent.appendChild(div)
        return div;
    }
}

export default Utility;
