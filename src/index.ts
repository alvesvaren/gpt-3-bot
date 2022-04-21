import 'dotenv/config';
import { Client, Intents, Message, ThreadChannel } from "discord.js";
import { ChannelTypes } from "discord.js/typings/enums";
import { Configuration, OpenAIApi } from "openai";

const client = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.DIRECT_MESSAGE_TYPING],
});

const configuration = new Configuration({
    apiKey: process.env.OPENAI_KEY,
});
const openAi = new OpenAIApi(configuration);

client.on("ready", () => {
    console.log(`Logged in as ${client.user?.tag}!`);
    console.log("\nHas access to servers:");
    (async () => console.log((await client.guilds.fetch()).map(guild => guild.name).join("\n")))();
});

const recurseReplies = async (msg: Message): Promise<string[]> => {
    const context = [msg.cleanContent];

    if (msg.reference?.messageId) {
        const history = await recurseReplies(await msg.channel.messages.fetch(msg.reference.messageId));
        context.unshift(...history);
    }

    return context;
};

client.on("messageCreate", async message => {
    if (message.author.id === client.user?.id) return;

    console.log(message.author.tag + ": " + message.cleanContent);

    if (message.channel.id === "966409383074492487") {
        await message.channel.sendTyping();
        const prompt = (await recurseReplies(message)).join("\n");
        const completion = await openAi.createCompletion("text-davinci-002", {
            prompt,
            max_tokens: 256,
            temperature: 0.4,
            frequency_penalty: 1.0,
        });

        const [result] = completion.data.choices || [null];

        await message.reply({
            content: result?.text || "?",
            allowedMentions: {
                repliedUser: false,
            },
        });
    }
});

client.login(process.env.DISCORD_TOKEN);
