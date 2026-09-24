/**
 * Class in charge of loading Twitch badges
 */
class BadgesLoader {

    //#region Fields / properties

    /** @type {string} Url for retrieving a badge */
    url = "https://static-cdn.jtvnw.net/badges/v1/";

    /**
     * @type {object} List of static Twitch badges as {name: ID}
     */
    staticBadges = {
        // Global
        staff: "d97c37bd-a6f5-4c38-8f57-4e4bef88af34",
        partner: "d12a2e27-16f6-41d0-ab77-b780518f00a3",
        premium: "bbbe0db0-a598-423e-86d0-f9fb98ca1933",

        // Channel
        broadcaster: "5527c58c-fb7d-422d-b71b-f309dcb85cc1",
        moderator: "3267646d-33f0-4b17-b3df-f923a41db1d0",
        VIP: "b817aba4-fad8-49e2-b88a-7cc744dfa6ec",
        founder: "511b78a9-ab37-472f-9569-457753bbe7d3",
        badge: "v1/4300a897-03dc-4e83-8c0e-c332fee7057f",
        no_audio: "aef2cd08-f29b-45a1-8c12-d44d7fd5e6f0",
        no_video: "199a0dba-58f3-494e-a7fc-1fa0a1001fb8",

        // Subs
        subscriber: "5d9f2208-5dd8-11e7-8513-2ff4adfae661",

        // Gifted subs
        sub_1: "f1d8486f-eb2e-4553-b44f-4d614617afc1",
        subs_5: "3e638e02-b765-4070-81bd-a73d1ae34965",
        subs_10: "bffca343-9d7d-49b4-a1ca-90af2c6a1639",
        subs_25: "17e09e26-2528-4a04-9c7f-8518348324d1",
        subs_50: "47308ed4-c979-4f3f-ad20-35a8ab76d85d",
        subs_100: "5056c366-7299-4b3c-a15a-a18573650bfb",
        subs_250: "df25dded-df81-408e-a2d3-40d48f0d529f",
        subs_500: "f440decb-7468-4bf9-8666-98ba74f6eab5",
        subs_1000: "b8c76744-c7e9-44be-90d0-08840a8f6e39",

        // Bits
        bit_1: "73b5c3fb-24f9-4a82-a852-2f475b59411c",
        bits_100: "09d93036-e7ce-431c-9a9e-7044297133f2",
        bits_1000: "0d85a29e-79ad-4c63-a285-3acd2c66f2ba",
        bits_5000: "57cd97fc-3e9e-4c6d-9d41-60147137234e",
        bits_10000: "68af213b-a771-4124-b6e3-9bb6d98aa732",
        bits_25000: "64ca5920-c663-4bd8-bfb1-751b4caea2dd",
        bits_50000: "62310ba7-9916-4235-9eba-40110d67f85d",
        bits_75000: "ce491fa4-b24f-4f3b-b6ff-44b080202792",
        bits_100000: "96f0540f-aa63-49e1-a8b3-259ece3bd098",
        bits_200000: "4a0b90c4-e4ef-407f-84fe-36b14aebdbb6",
        bits_300000: "ac13372d-2e94-41d1-ae11-ecd677f69bb6",
        bits_400000: "a8f393af-76e6-4aa2-9dd0-7dcc1c34f036",
        bits_500000: "f6932b57-6a6e-4062-a770-dfbd9f4302e5",
        bits_600000: "4d908059-f91c-4aef-9acb-634434f4c32e",
        bits_700000: "a1d2a824-f216-4b9f-9642-3de8ed370957",
        bits_800000: "5ec2ee3e-5633-4c2a-8e77-77473fe409e6",
        bits_900000: "088c58c6-7c38-45ba-8f73-63ef24189b84",
        bits_1000000: "494d1c8e-c3b2-4d88-8528-baff57c9bd3f"
    };

    //#endregion

    //#region Methods

    /**
     * Get the full url for a badge
     * @param {string} badge Badge
     * @param {int} size Size (by default 1 for 18x18, can be 2 or 3 for bigger sizes)
     * @returns {string} Url (empty if badge is invalid)
     */
    getBadgeUrl(badge, size = 1) {
        if (this.staticBadges.hasOwnProperty(badge) == false) {
            return "";
        }

        // Restrict size to proper values
        if (size < 1) {
            size = 1;
        } else if (size > 3) {
            size = 3;
        }

        return `${this.url}${this.staticBadges[badge]}/${size}`;
    }

    //#endregion
}

export default BadgesLoader;
