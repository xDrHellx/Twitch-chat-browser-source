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
     * @param {string} options.textColor Text color (By default inherit from CSS)
     * @param {HTMLElement} options.parent Parent element (By default no element)
     * @returns {HTMLDivElement} Div instance
     */
    static createDiv({content = "", classes = "", textColor = "", parent = undefined}) {
        const div = document.createElement("div");
        div.className = classes;
        if (textColor !== "") div.style.color = textColor;
        if (content !== "") div.innerHTML = content;
        if (parent != undefined) parent.appendChild(div)
        return div;
    }
}

export default Utility;
