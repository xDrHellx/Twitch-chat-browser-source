/**
 * Class containing the config for showing Twitch chat
 */
export default class TwitchConfig {
    constructor() {
        /**
         * Twitch credentials (necessary for connecting to chat):
         * - Channel to join (AKA chat to show)
         * - Username, ideally same as channel
         * - Access Token (associated with username)
         *
         * Wrong credentials will prevent from connecting to chat & retrieving emotes
         */
        this.channel = "your_channel";
        this.username = "your_username";
        this.accessToken = "access_token";

        /**
         * How long does a message takes to disappear (in seconds)
         * Should not be less than 30 seconds for readability reasons
         */
        this.msgDisplayTime = 45;

        // User input for these Channel Point rewards won't be shown
        this.hiddenRewards = [
            "123-456-789"  // "Example reward name"
        ];

        // Messages from these users won't be shown (usually for bots, separated by a comma))
        this.ignoredUsers = [
            "nightbot",
            "streamelements",
            "moobot",
        ];

        /**
         * If true, messages starting with "!" won't be shown (usually bot commands)
         * If you still want these, just set the value to false
         */
        this.filterCommands = true

        /**
         * Template to use for messages :
         * - Case sensitive
         * - .html file must exist in "tpl" subfolder
         * - .css file must exist in "css" subfolder
         */
        this.template = "default";

        /**
         * If true, shows FrankerFaceZ, BetterTwitchTV, 7TV emotes
         * Just set the value to false if you want to disable one of them
         *
         * Warning: Disabled emotes will be shown as text instead (for example "Kappa" instead of the actual emote)
         */
        this.allowFfz    = true;
        this.allowBttv   = true;
        this.allow7tv    = true;

        /**
         * If true, shows global emotes
         * (mostly made this for me cos' i hate global 7TV emotes)
         */
        this.allowFfzGlobals    = true;
        this.allowBttvGlobals   = true;
        this.allow7tvGlobals    = true;
    }
}
