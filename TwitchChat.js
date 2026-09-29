import TwitchConfig from './TwitchConfig.js';
import Utility from './subclasses/Utility.js';
import EmotesLoader from './subclasses/EmotesLoader.js';
import BadgesLoader from './subclasses/BadgesLoader.js';

/**
 * Class for loading & handling Twitch Chat
 */
export default class TwitchChat {

    //#region Fields / properties

    #channel = "";
    #username = "";
    #accessToken = "";
    #msgDisplayTime = 45;

    #hiddenRewards = [];
    #ignoredUsers = [];
    #filterCommands = true;
    #htmlTpl = "";
    #cssTpl = "";

    #ws = null;
    #emotesLoader = null;
    #badgesLoader = null;
    chat = document.getElementById("chat");
    emotes = new Map();

    //#endregion

    //#region Constructor

    constructor() {
        const config = new TwitchConfig();
        this.#channel = config.channel;
        this.#username = config.username;
        this.#accessToken = config.accessToken;
        this.#msgDisplayTime = config.msgDisplayTime;
        this.#hiddenRewards = config.hiddenRewards;
        this.#ignoredUsers = config.ignoredUsers;
        this.#filterCommands = config.filterCommands;
        this.#emotesLoader = new EmotesLoader(this.#channel, config.allowFfz, config.allowBttv, config.allow7tv, config.allowFfzGlobals, config.allowBttvGlobals, config.allow7tvGlobals);
        this.#badgesLoader = new BadgesLoader();
        this.getTemplate(config.template);
    }

    //#endregion

    //#region Template

    /**
     * Get the HTML & CSS template files
     * @param {string} template Template name
     */
    async getTemplate(template) {
        this.#htmlTpl = this.getFileContent(`tpl/${template}.html`, `Missing HTML file for "${template}" template.`);
        this.#cssTpl = await this.getFileContent(`css/${template}.css`, `Missing CSS file for "${template}" template.`);

        // Include CSS to index.html
        if (this.#cssTpl != undefined && this.#cssTpl != "") {
            const linkTag = document.createElement("link");
            linkTag.rel = "stylesheet";
            linkTag.href = `css/${template}.css`;
            document.head.appendChild(linkTag);
        }
    }

    //#endregion

    //#region Initializing

    /**
     * Initialize the chat
     */
    initialize() {
        this.#connectToChat();
        this.#loadEmotes();
    }

    /**
     * Connect to the chat
     */
    #connectToChat() {
        this.#ws = new WebSocket("wss://irc-ws.chat.twitch.tv:443");

        this.#ws.onopen = () => {
            this.#ws.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
            this.#ws.send(`PASS oauth:${this.#accessToken}`);
            this.#ws.send(`NICK ${this.#username}`);
            this.#ws.send(`JOIN #${this.#channel}`);
        };

        this.#ws.onmessage = e => {
            for (const line of e.data.split("\r\n")) {
                this.#handle(line);
                this.#hideOverflowingMessages();
            }
        };

        this.#ws.onclose = () => {
            console.log("Disconnected from chat, attempting to reconnect...")
            this.#showErrorMessage("Disconnected from chat, attempting to reconnect...");
            setTimeout(() => this.#connectToChat(), 5000);
        }
    }

    /**
     * Load emotes
     */
    async #loadEmotes() {
        if (this.#emotesLoader == null) {
            return;
        }

        await this.#emotesLoader.loadChannelEmotes();
        this.emotes = this.#emotesLoader.emotes;
    }

    //#endregion

    //#region Chat messages

    /**
     * Handle whatever it sent
     * @param {string} line
     */
    #handle(line) {

        // Ping-pong response from Twitch servers
        if (line.startsWith("PING")) {
            this.#ws.send("PONG :tmi.twitch.tv");
            return;
        }

        // Response when successfully joining chat
        if (line.startsWith(`:${this.#username}!`) && line.includes(` JOIN #${this.#channel}`)) {
            console.log(`Connected to ${this.#channel}'s chat.`);
            this.#showSuccessMessage(`Connected to ${this.#channel}'s chat.`);
            return;
        }

        // Filter whispers out while retrieving tags, username, indicator & message
        let msg = line.match(/^@([^ ]+) :([^!]+)(?:![^ ]+)? (PRIVMSG|CLEARMSG) #[^ ]+ :(.*)$/);
        if (msg == null) {
            return;
        }

        // Process tags to turn them into JS object (easier to work with)
        const tags = {};
        for (const tag of msg[1].split(";")) {
            const [key, ...value] = tag.split("=");
            tags[key] = value.join("=");
        }

        // If the message was deleted on Twitch, delete it in the browser source too
        if (msg[3] == "CLEARMSG") {
            this.#deleteChatMessage(tags["target-message-id"]);
            return;
        }

        // Otherwise show the message in browser source
        tags.username = msg[2].toLowerCase();
        this.#showChatMessage(tags, msg[4]);
    }

    /**
     * Show a received message from Twitch chat
     * @param {object} tags
     * @param {string} msg
     */
    #showChatMessage(tags, msg) {

        /**
         * Filter out:
         * - Messages from ignored users (mostly bots)
         * - Bot commands
         * - Channel point rewards that requires user input
         */ 
        const user = tags.username;
        if (
            this.#ignoredUsers.some(ignoredUser => ignoredUser.toLowerCase() === user.toLowerCase())
            || (this.#filterCommands == true && msg.trim().startsWith("!"))
            || (Object.hasOwn(tags, "custom-reward-id") == true && this.#hiddenRewards.includes(tags["custom-reward-id"]))
        ) {
            return;
        }

        /**
         * Populate template & show the message
         * Then add a timeout to remove the message after some time
         */
        this.#htmlTpl.then(html => {
            const div = Utility.createDiv({
                content: html
                    .replace("{{BADGES}}", this.#renderBadges(tags))
                    .replace("{{USERNAME}}", this.#renderUsername(tags["display-name"], tags.color))
                    .replace("{{MESSAGE}}", this.#renderMessage(msg, tags.emotes)),
                classes: "message show",
                attributes: Object.hasOwn(tags, "target-message-id") == true ? {"data-msg-id": tags["target-message-id"]} : {},
                parent: this.chat
            });

            this.#removeMessageAfterTime(div, this.#msgDisplayTime);
        });
    }

    /**
     * Delete a message received from Twitch chat
     * @param {string} id Message ID
     */
    #deleteChatMessage(id) {
        const msg = this.chat.querySelector(`[data-msg-id="${id}"]`);
        if (msg != undefined) {
            this.#removeMessageAfterTime(msg, 0);
        }
    }

    /**
     * Remove a chat message after a specified duration
     * @param {HTMLDivElement} div Message div
     * @param {int} duration Duration to wait for (in seconds) before removing the message
     */
    #removeMessageAfterTime(div, duration) {
        setTimeout(() => {
            div.classList.add("hide")
            div.classList.remove("show");
            div.addEventListener("animationend", () => div.remove(), {once: true});
        }, Utility.convertSecondsToMilliseconds(duration));
    }

    //#endregion

    //#region Rendering

    /**
     * Render a username
     * @param {string} username Username
     * @param {string} color User color
     * @returns {string} Rendered username
     */
    #renderUsername(username, color) {
        return `<b${color != "" ? ` style="color:${color}"` : ""}>${Utility.escapeHtml(username)}</b>`;
    }

    /**
     * Render a chat message
     * @param {string} msg
     * @param {string} emotesString
     * @returns {string} Rendered chat msg
     */
    #renderMessage(msg, emotesString) {

        // Retrieve emote IDs & positions
        const parts = [];
        for (const group of (emotesString ?? "").split("/")) {

            const [id, positions] = group.split(":");
            for (const p of (positions ?? "").split(",")) {
                if (p.trim() == "") {
                    continue;
                }

                const [start, end] = p.split("-").map(Number);
                parts.push({start, end: end + 1, html: `<img class="emote" alt="${msg.slice(start, end + 1)}" src="https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/3.0">`});
            }
        }

        // Render emotes in order within the message
        parts.sort((a, b) => a.start - b.start);
        let html = "",
            last = 0;
        for (const p of parts) {
            html += this.#renderEmotes(msg.slice(last, p.start));
            html += p.html;
            last = p.end;
        }

        return `<span class="text">${html + this.#renderEmotes(msg.slice(last))}</span>`;
    }

    /**
     * Render emotes from a string
     * @param {string} str
     * @returns {string} Rendered emotes
     */
    #renderEmotes(str) {
        return str.split(/(\s+)/).map(word => {
            if (/^\s+$/.test(word)) {
                return word;
            }

            const 
                name = word.replace(/^[^\w]*|[^\w]*$/g, ""),
                url = this.emotes.get(name) ?? this.emotes.get(`:${name}:`);
            return url != undefined ? `<img class="emote" alt="${name} src="${url}"">` : Utility.escapeHtml(word);
        }).join("");
    }

    /**
     * Render a user's badges
     * @param {object} tags
     * @returns {string} Rendered badges span (or empty if we don't want to show them)
     */
    #renderBadges(tags) {
        let badges = tags.badges?.split(",").map(badge => {
            const
                [name] = badge.split("/"),
                badgeUrl = this.#badgesLoader.getBadgeUrl(name);
            return badgeUrl != "" ? `<img class="badge" src="${badgeUrl}" alt="${name}">` : "";
        }).join("") ?? "";

        return badges == "" ? "" : `<span class="badges">${badges}</span>`;
    }

    //#endregion

    //#region Misc

    /**
     * Hide messages overflowing from the top (messages that aren't entirely visible)
     */
    #hideOverflowingMessages() {
        const
            containerRect = this.chat.getBoundingClientRect(),
            messages = [...this.chat.children],
            messagesToHide = messages.filter(message => {
                const rect = message.getBoundingClientRect();
                return rect.top < containerRect.top;
            });

        messagesToHide.forEach(message => {
            message.classList.add("hide");
            message.classList.remove("show");
        });
    }

    /**
     * Show a success message
     * @param {string} msg
     */
    #showSuccessMessage(msg) {
        this.#showBrowserSourceMessage(`<span class="text success">${msg}</span>`);
    }

    /**
     * Show an error message
     * @param {string} msg
     */
    #showErrorMessage(msg) {
        this.#showBrowserSourceMessage(`<span class="text error">${msg}</span>`);
    }

    /**
     * Show a message that only appears in the browser source (handled like a Twitch chat message)
     * @param {string} msg
     */
    #showBrowserSourceMessage(msg) {
        const div = Utility.createDiv({content: `<span class="text">${msg}</span>`, classes: "message show", textColor: "#cfcdcd", parent: this.chat});
        this.#removeMessageAfterTime(div, this.#msgDisplayTime);
        this.#hideOverflowingMessages();
    }

    /**
     * Get content from a file
     * @param {string} path Path to file
     * @param {string} errorMsg Error message to show
     * @returns {Promise} Promise
     */
    async getFileContent(path, errorMsg) {
        return fetch(path)
            .then(r => r.ok === true ? r.text() : null)
            .then(text => {
                if (text === null) {
                    console.log(errorMsg);
                    this.#showErrorMessage(errorMsg);
                    return;
                }

                return text;
            });
    }

    //#endregion
}
