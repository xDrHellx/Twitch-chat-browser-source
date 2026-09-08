import TwitchConfig from './TwitchConfig.js';

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

    #allowFfz = true;
    #allowBttv = true;
    #allow7tv = true;
    #allowFfzGlobals = true;
    #allowBttvGlobals = true;
    #allow7tvGlobals = true;

    #ws = null;
    #twitchUserId = null;
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

        this.#allowFfz = config.allowFfz;
        this.#allowBttv = config.allowBttv;
        this.#allow7tv = config.allow7tv;
        this.#allowFfzGlobals = config.allowFfzGlobals;
        this.#allowBttvGlobals = config.allowBttvGlobals;
        this.#allow7tvGlobals = config.allow7tvGlobals;
    }

    //#endregion

    //#region Initializing

    /**
     * Initialize the chat
     */
    initialize() {
        this.#connectToChat();
        this.#loadChannelEmotes();
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
            }
        };

        this.#ws.onclose = () => {
            console.log("Disconnected from chat, reconnecting in 5 seconds...")
            setTimeout(() => this.#connectToChat(), 5000);
        }
    }

    //#endregion

    //#region Emotes

    /**
     * Load FFZ, BTTV & 7TV emotes for the current channel
     */
    async #loadChannelEmotes() {
        await this.#loadFfzEmotes();
        await this.#loadBttvEmotes();
        await this.#load7tvEmotes();
        console.log("Loaded channel emotes:", this.emotes.size);
    }

    async #loadFfzEmotes() {
        if (this.#allowFfz !== true) {
            return;
        }

        // Globals & effects
        if (this.#allowFfzGlobals === true) {
            await this.#loadEmotes(
                "https://api.frankerfacez.com/v1/set/global",
                data => Object.values(data.sets ?? {}).flatMap(s => s.emoticons ?? []).map(e => [e.name, e.urls?.["2"] || e.urls?.["1"]])
            );
        }

        // Channel-specific
        if (this.#channel.length > 0) {
            await this.#loadEmotes(
                `https://api.frankerfacez.com/v1/room/${this.#channel}`,
                data => Object.values(data.sets ?? {}).flatMap(s => s.emoticons ?? []).map(e => [e.name, e.urls?.["2"] || e.urls?.["1"]])
            );
        }
    }

    async #loadBttvEmotes() {
        if (this.#allowBttv !== true) {
            return;
        }

        // Globals
        if (this.#allowBttvGlobals === true) {
            await this.#loadEmotes(
                "https://api.betterttv.net/3/cached/emotes/global",
                data => data.map(e => [e.code, `https://cdn.betterttv.net/emote/${e.id}/3x`])
            );
        }

        // Channel-specific
        this.#twitchUserId ??= await this.#getTwitchUserId(this.#channel);
        if (this.#twitchUserId != null) {
            await this.#loadEmotes(
                `https://api.betterttv.net/3/cached/users/twitch/${this.#twitchUserId}`,
                data => [...data.channeldata ?? [], ...data.sharedEmotes ?? []].map(e => [e.code, `https://cdn.betterttv.net/emote/${e.id}/3x`])
            );
        }
    }

    async #load7tvEmotes() {
        if (this.#allow7tv !== true) {
            return;
        }

        // Globals
        if (this.#allow7tvGlobals === true) {
            await this.#loadEmotes(
                "https://7tv.io/v3/emote-sets/global",
                data => (data.emotes ?? []).map(e => [e.name, `https://cdn.7tv.app/emote/${e.id}/4x.webp`])
            );
        }

        // Channel-specific
        this.#twitchUserId ??= await this.#getTwitchUserId(this.#channel);
        if (this.#twitchUserId != null) {
            await this.#loadEmotes(
                `https://7tv.io/v3/users/twitch/${this.#twitchUserId}`,
                data => (data.emote_set?.emotes ?? []).map(e => [e.name, `https://cdn.7tv.app/emote/${e.id}/4x.webp`])
            );
        }
    }

    /**
     * Fetch emotes from an url & parse through the results using the passed function
     * @param {string} url API url
     * @param {Function} extractFunction Function for extracting the emotes
     */
    async #loadEmotes(url, extractFunction) {
        try {
            const data = await fetch(url).then(r => r.json());
            for (const e of extractFunction(data)) {
                this.emotes.set(e[0], e[1]);
            }
        } catch {}
    }

    /**
     * Get a Twitch account's ID from its username
     * We use decapi.me to avoid storing more credentials
     * @param {string} username
     * @returns {Promise<number> | null} ID (null if username)
     */
    async #getTwitchUserId(username) {
        return username.length > 0 ? Number(await fetch(`https://decapi.me/twitch/id/${username}`).then(r => r.text())) : null;
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
            console.log("Connected to chat.");
            return;
        }

        // Filter private messages / whispers out
        const msg = line.match(/^@([^ ]+) :([^!]+)![^ ]+ PRIVMSG #[^ ]+ :(.*)$/);
        if (msg == null) {
            return;
        }

        const tags = {};
        for (const tag of msg[1].split(";")) {
            const [key, ...value] = tag.split("=");
            tags[key] = value.join("=");
        }

        tags.username = msg[2].toLowerCase();
        this.#showMessage(tags, msg[3]);
    }

    /**
     * Show a received message from Twitch chat
     * @param {object} tags
     * @param {string} msg
     */
    #showMessage(tags, msg) {

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

        // Show the message
        const div = document.createElement("div");
        div.className = "message show";
        div.innerHTML = `
            <b style="color:${tags.color}">
                ${this.escapeHtml(tags["display-name"])}
            </b>: ${this.#renderMessage(msg, tags.emotes)}`;

        this.chat.appendChild(div);

        // Remove message after X seconds
        setTimeout(() => {
            div.classList.add("hide");
            div.classList.remove("show");
            div.addEventListener("animationend", () => div.remove(), {once: true});
        }, this.convertSecondsToMilliseconds(this.#msgDisplayTime));
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
                parts.push({start, end: end + 1, html: `<img class="emote" data-txt="${msg.slice(start, end + 1)}" src="https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/3.0">`});
            }
        }

        parts.sort((a, b) => a.start - b.start);

        // Render emotes (in order) within the message
        let html = "",
            last = 0;
        for (const p of parts) {
            html += this.#renderEmotes(msg.slice(last, p.start));
            html += p.html;
            last = p.end;
        }

        return html + this.#renderEmotes(msg.slice(last));
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
            return url != undefined ? `<img class="emote" src="${url}">` : this.escapeHtml(word);
        }).join("");
    }

    //#endregion

    //#region Utils

    /**
     * Escape HTML characters in a string
     * @param {string} str
     */
    escapeHtml(str) {
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
    convertSecondsToMilliseconds(s) {
        return s * 1000;
    }

    //#endregion
}

export default TwitchChat;
