import TwitchConfig from './TwitchConfig.js';
import Utility from './subclasses/Utility.js';
import EmotesLoader from './subclasses/EmotesLoader.js';
import BadgesLoader from './subclasses/BadgesLoader.js';

/**
 * Class for loading & handling Twitch Chat
 */
class TwitchChat {

    //#region Fields / properties

    #channel = "";
    #username = "";
    #accessToken = "";
    #msgDisplayTime = 45;

    #hiddenRewards = [];
    #ignoredUsers = [];
    #filterCommands = true;
    #showBadges = true;

    #ws = null;
    #emotesLoader = null;
    #BadgesLoader = null;
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
        this.#showBadges = config.showBadges;

        this.#emotesLoader = new EmotesLoader(this.#channel, config.allowFfz, config.allowBttv, config.allow7tv, config.allowFfzGlobals, config.allowBttvGlobals, config.allow7tvGlobals);
        this.#BadgesLoader = new BadgesLoader();
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
            this.#showBrowserSourceMessage("Disconnected from chat, attempting to reconnect...");
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
            this.#showBrowserSourceMessage(`Connected to ${this.#channel}'s chat.`);
            return;
        }

        /**
         * Filter whispers out
         * Also retrieve tags, username & message
         */
        const msg = line.match(/^@([^ ]+) :([^!]+)![^ ]+ PRIVMSG #[^ ]+ :(.*)$/);
        if (msg == null) {
            return;
        }

        // Process tags to turn them into JS object (easier to work with)
        const tags = {};
        for (const tag of msg[1].split(";")) {
            const [key, ...value] = tag.split("=");
            tags[key] = value.join("=");
        }

        tags.username = msg[2].toLowerCase();
        this.#showChatMessage(tags, msg[3]);
    }

    /**
     * Show a received message from Twitch chat
     * @param {object} tags
     * @param {string} msg
     */
    #showChatMessage(tags, msg) {

        // Filter out messages from ignored users (mostly bots)
        const user = tags.username;
        if (this.#ignoredUsers.some(ignoredUser => ignoredUser.toLowerCase() === user.toLowerCase())) {
            return;
        }

        // Bot commands
        if (this.#filterCommands == true && msg.trim().startsWith("!")) {
            return;
        }

        // Messages from channel point rewards that requires user input
        if (Object.hasOwn(tags, "custom-reward-id") == true && this.#hiddenRewards.includes(tags["custom-reward-id"])) {
            return;
        }

        // Show the message, then remove it after some time
        const div = this.createDiv({
            content: `${this.#renderBadges(tags)}<span><b style="color:${tags.color}">${this.escapeHtml(tags["display-name"])}</b>: </span>${this.#renderMessage(msg, tags.emotes)}`,
            classes: "message show",
            parent: this.chat
        });
        this.#removeMessageAfterTime(div, this.#msgDisplayTime);
    }

    /**
     * Remove a chat message after a specified duration
     * @param {HTMLDivElement} div Message div
     * @param {int} duration Duration to wait for (in milliseconds) before removing the message
     */
    #removeMessageAfterTime(div, duration) {
        setTimeout(() => {
            div.classList.add("hide")
            div.classList.remove("show");
            div.addEventListener("animationend", () => div.remove(), {once: true});
        }, Utility.convertSecondsToMilliseconds(duration));
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
     * @returns {string} String with rendered emotes
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
     * @returns {string} String with rendered badges (or empty if we don't want to show them)
     */
    #renderBadges(tags) {
        if (this.#showBadges != true) {
            return "";
        }

        let badges = tags.badges?.split(",").map(badge => {
            const
                [name] = badge.split("/"),
                badgeUrl = this.#BadgesLoader.getBadgeUrl(name);
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
     * Show a message that only appears in the browser source (handled like a Twitch chat message)
     * @param {string} msg Message
     */
    #showBrowserSourceMessage(msg) {
        const div = Utility.createDiv({content: Utility.escapeHtml(msg), classes: "message show", textColor: "#cfcdcd", parent: this.chat});
        this.#removeMessageAfterTime(div, this.#msgDisplayTime);
        this.#hideOverflowingMessages();
    }

    //#endregion
}

export default TwitchChat;
