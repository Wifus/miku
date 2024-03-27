const { Client, Constants: { InteractionTypes } } = require('eris');
const axios = require('axios').default;

const { bots: { miku: { token: TOKEN } } } = require('../tokens.json');
const { private_guild, owo_grind_category, bots, channels } = require('./config.json');

const Bot = new Client(TOKEN, {
    intents: 513,
    restMode: true,
    defaultImageFormat: 'png'
});

Bot.on('ready', async () => {
    console.log(`Miku is ready!`);
});

Bot.on('messageCreate', async (message) => {
    if (message.guildID != private_guild) return;

    const CHANNELS = Bot.guilds.get(private_guild)?.channels || await Bot.getRESTGuildChannels(private_guild).catch(() => undefined);
    if (!CHANNELS) return;

    if (!CHANNELS.filter(c => c.parentID == owo_grind_category).map(c => c.id).includes(message.channel.id)) return;

    if (message.author.id == bots.OwO) return;

    await message.delete();
});

async function downloadImageToBuffer(url) {
    try {
        // Make HTTP GET request to fetch the image
        const response = await axios.get(url, {
            responseType: 'arraybuffer' // Set the responseType to arraybuffer to get binary data
        });

        // Convert the response data into a buffer
        const imageBuffer = Buffer.from(response.data, 'binary');

        return imageBuffer;
    } catch (error) {
        console.error('Error downloading image:', error);
        throw error;
    }
}

Bot.on('interactionCreate', async (interaction) => {
    if (interaction.type != InteractionTypes.APPLICATION_COMMAND) return;
    if (!interaction.data) return;

    // @ts-ignore
    const { name, resolved: { users, members }, target_id: user_id } = interaction.data;

    // Todo: Add banners too?
    if (name != 'Avatar') return;

    await interaction.defer();

    const USER = users?.get(user_id);
    const { avatar: member_avatar } = members?.get(user_id);

    // Should never happen, but just to be safe
    if (!USER) return;

    const files = [{
        file: await downloadImageToBuffer(USER.dynamicAvatarURL(null, 4096)),
        name: `${user_id}.${USER.avatar.startsWith('a_') ? 'gif' : 'png'}`
    }];

    if (member_avatar) {
        files.push({
            // Can't use Eris built in to get url because it expects guild to be in cache which may (will probably) not be true
            file: await downloadImageToBuffer(`https://cdn.discordapp.com/guilds/${interaction.guildID}/users/${user_id}/avatars/${member_avatar}.${member_avatar.startsWith('a_') ? 'gif' : 'png'}?size=4096`),
            name: `${user_id}_${interaction.guildID}.${member_avatar.startsWith('a_') ? 'gif' : 'png'}`
        })
    }

    await interaction.createMessage({ flags: 1 << 6 }, files);
    await Bot.createMessage(channels.avatar, '', files);
});

Bot.on('error', (err) => {
    console.log(err);
});

Bot.connect();