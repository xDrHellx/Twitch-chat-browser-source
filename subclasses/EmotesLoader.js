/**
 * Class in charge of loading chat emotes
 */
export default class EmotesLoader {

    //#region Fields / properties

    emotes = new Map();

    #channel = "";
    #twitchUserId = null;
    #allowFfz = true;
    #allowBttv = true;
    #allow7tv = true;
    #allowFfzGlobals = true;
    #allowBttvGlobals = true;
    #allow7tvGlobals = true;

    //#endregion

    //#region Constructor

    /**
     * EmotesLoader constructor: loads emotes for a specific channel
     * @param {string} channel Channel to load emotes for
     * @param {bool} allowFfz Allow FFZ channel emotes
     * @param {bool} allowBttv Allow BTTV channel emotes
     * @param {bool} allow7tv Allow 7TV channel emotes
     * @param {bool} allowFfzGlobals Allow FFZ global emotes
     * @param {bool} allowBttvGlobals Allow BTTV global emotes
     * @param {bool} allow7tvGlobals Allow 7TV global emotes
     */
    constructor(channel, allowFfz = true, allowBttv = true, allow7tv = true, allowFfzGlobals = true, allowBttvGlobals = true, allow7tvGlobals = true) {
        this.#channel = channel;
        this.#allowFfz = allowFfz;
        this.#allowBttv = allowBttv;
        this.#allow7tv = allow7tv;
        this.#allowFfzGlobals = allowFfzGlobals;
        this.#allowBttvGlobals = allowBttvGlobals;
        this.#allow7tvGlobals = allow7tvGlobals;
    }

    //#endregion

    //#region Methods

    /**
     * Load global & channel-specific emotes (FFZ, BTTV & 7TV)
     */
    async loadChannelEmotes() {
        this.emotes.clear();
        await this.#loadFfzEmotes();
        await this.#loadBttvEmotes();
        await this.#load7tvEmotes();
        console.log(`Loaded channel emotes for ${this.#channel}: ${this.emotes.size}`);
    }

    async #loadFfzEmotes() {
        if (this.#allowFfz !== true) {
            return;
        }

        // Globals & effects
        if (this.#allowFfzGlobals === true) {
            await this.#loadEmotesFromurl(
                "https://api.frankerfacez.com/v1/set/global",
                data => Object.values(data.sets ?? {}).flatMap(s => s.emoticons ?? []).map(e => [e.name, e.urls?.["2"] || e.urls?.["1"]])
            );
        }

        // Channel-specific
        if (this.#channel.length > 0) {
            await this.#loadEmotesFromurl(
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
            await this.#loadEmotesFromurl(
                "https://api.betterttv.net/3/cached/emotes/global",
                data => data.map(e => [e.code, `https://cdn.betterttv.net/emote/${e.id}/3x`])
            );
        }

        // Channel-specific
        this.#twitchUserId ??= await this.#getTwitchUserId(this.#channel);
        if (this.#twitchUserId != null) {
            await this.#loadEmotesFromurl(
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
            await this.#loadEmotesFromurl(
                "https://7tv.io/v3/emote-sets/global",
                data => (data.emotes ?? []).map(e => [e.name, `https://cdn.7tv.app/emote/${e.id}/4x.webp`])
            );
        }

        // Channel-specific
        this.#twitchUserId ??= await this.#getTwitchUserId(this.#channel);
        if (this.#twitchUserId != null) {
            await this.#loadEmotesFromurl(
                `https://7tv.io/v3/users/twitch/${this.#twitchUserId}`,
                data => (data.emote_set?.emotes ?? []).map(e => [e.name, `https://cdn.7tv.app/emote/${e.id}/4x.webp`])
            );
        }
    }

    //#endregion

    //#region Utils

    /**
     * Get a Twitch account's ID from its username
     * We use decapi.me to avoid storing more credentials
     * @param {string} username
     * @returns {Promise<number> | null} ID (null if username is invalid)
     */
    async #getTwitchUserId(username) {
        return username.length > 0 ? Number(await fetch(`https://decapi.me/twitch/id/${username}`).then(r => r.text())) : null;
    }

    /**
     * Fetch emotes from an url & parse through the results using the passed function
     * @param {string} url API url
     * @param {Function} extractFunction Function for extracting the emotes
     */
    async #loadEmotesFromurl(url, extractFunction) {
        try {
            const data = await fetch(url).then(r => r.json());
            for (const e of extractFunction(data)) {
                this.emotes.set(e[0], e[1]);
            }
        } catch {}
    }

    //#endregion
}
