import { createCanvas, loadImage } from 'canvas';
import { Command, CommandoClient, CommandoMessage } from 'discord.js-commando';
import {
    Attribute,
    decodeTemplate,
    getAttributeName,
    getProfessionAbbreviation,
    getProfessionName,
    Profession,
    Skillbar,
} from '../../lib/skills';
import { MessageAttachment } from 'discord.js';
import skills from '../../../assets/skills.json';
import {
    ACTIVATION,
    ADRENALINE,
    DIGITS,
    ENERGY,
    OVERCAST,
    PROFESSION,
    RECHARGE,
    SACRIFICE,
    TEMPLATE,
    UPKEEP
} from '../../helper/emoji';
import path = require('path');

const IMAGE_SIZE = 64;

// @todo move this somewhere sensible
const assets = path.join(__dirname, '../../../assets');

export default class SkillbarCommand extends Command {
    constructor(client: CommandoClient) {
        super(client, {
            name: 'skillbar',
            aliases: ['s','build'],
            group: 'gw',
            memberName: 's',
            description: 'Previews a skill template.',
            details: '',
            examples: ['s 12341234'],

            args: [
                {
                    key: 'template',
                    prompt: 'enter valid skill template code.',
                    type: 'string',
                }
            ]
        });

        client.on('messageReactionAdd', async (reaction, user) => {
            if (reaction.partial) {
                await reaction.fetch();
            }

            const message = reaction.message;
            if (!client.user || message.author.id !== client.user.id) return;
            if (user.id === client.user.id) return;

            const template = message.content.match(/-- `([^`]+)` --/);
            if (!template) return;

            const skillbar = decodeTemplate(template[1]);
            if (!skillbar) return;

            const index = DIGITS.indexOf(reaction.emoji.name);
            if (index === -1) return;

            await message.edit(buildMessage(skillbar, index - 1));
        });
    }

    async run(message: CommandoMessage, args: {
        template: string,
    }) {
        const skillbar = decodeTemplate(args.template);

        if (!skillbar) return message.say(`\`${args.template}\` is not a valid skill template.`);

        const canvas = createCanvas(8 * IMAGE_SIZE, IMAGE_SIZE);
        const ctx = canvas.getContext('2d');

        const images = await Promise.all(
            skillbar.skills.map(skillID => loadImage(path.join(assets, 'skills', `${skillID}.jpg`)))
        );
        images.forEach((image, index) => ctx.drawImage(image, index * IMAGE_SIZE, 0, IMAGE_SIZE, IMAGE_SIZE));

        const attachment = new MessageAttachment(canvas.toBuffer(), `${args.template}.png`);
        const result = await message.say(buildMessage(skillbar, 0), attachment);
        const lastMessage = Array.isArray(result) ? result[result.length - 1] : result;
        for (let i = 0; i < skillbar.skills.length; i++) {
            await lastMessage.react(DIGITS[i + 1]);
        }

        return result;
    }
}

function buildMessage(skillbar: Skillbar, skillIndex: number) {
    const skillId = skillbar.skills[skillIndex];
    const skillData = skills[skillId];

    if (!skillData) return null;

    const primary = `${PROFESSION.get(skillbar.primary)} ${getProfessionAbbreviation(skillbar.primary)}`;
    const secondary = `${getProfessionAbbreviation(skillbar.secondary)} ${PROFESSION.get(skillbar.secondary)}`;

    const listAttributes = (attributes: Skillbar['attributes']) => {
        const arr = [];
        for (const attribute in attributes) {
            const attr: Attribute = attribute as unknown as Attribute;
            arr.push(`${getAttributeName(attr)}: **${skillbar.attributes[attr]}**`);
        }
        return arr;
    };

    const skillInfo = [];
    if (skillData.z?.d) skillInfo.push(`-${skillData.z.d} ${UPKEEP}`);
    if (skillData.z?.a) skillInfo.push(`${skillData.z.a} ${ADRENALINE}`);
    if (skillData.z?.e) skillInfo.push(`${skillData.z.e} ${ENERGY}`);
    if (skillData.z?.s) skillInfo.push(`${skillData.z.s} ${SACRIFICE}`);
    if (skillData.z?.c) skillInfo.push(`${skillData.z.c} ${ACTIVATION}`);
    if (skillData.z?.r) skillInfo.push(`${skillData.z.r} ${RECHARGE}`);
    if (skillData.z?.x) skillInfo.push(`${skillData.z.x} ${OVERCAST}`);
    if (skillData.p) skillInfo.push(`Prof: **${getProfessionName(skillData.p)}**`);
    if (skillData.a) skillInfo.push(`Attrb: **${getAttributeName(skillData.a)}**`);
    if (skillData.t) skillInfo.push(`Type: **${getSkillTypeName(skillData)}**`);

    return [
        `${primary} / ${secondary} -- \`${skillbar.template}\` -- ${TEMPLATE}`,
        listAttributes(skillbar.attributes).join(' '),
        '',
        `Skill ${skillIndex + 1}: **${skillData.n}** -- <https://wiki.guildwars.com/wiki/${encodeURIComponent(skillData.n)}>`,
        `${skillData.d}`,
        '',
        skillInfo.join(' '),
    ];
}

function getSkillTypeName(skillData: NonNullable<typeof skills[number]>) {
    return skillData.e ? `Elite ${getTypeName()}` : getTypeName();

    function getTypeName() {
        switch (skillData.t) {
        case 3:
            return 'Stance';
        case 4:
            return 'Hex Spell';
        case 5:
            return 'Spell';
        case 6:
            if (skillData.z?.sp && skillData.z.sp & 0x800000) {
                return 'Flash Enchantment Spell';
            }
            return 'Enchantment Spell';
        case 7:
            return 'Signet';
        case 9:
            return 'Well Spell';
        case 10:
            return 'Touch Skill';
        case 11:
            return 'Ward Spell';
        case 12:
            return 'Glyph';
        case 14:
            switch (skillData.z?.q) {
            case 1:
                return 'Axe Attack';
            case 2:
                return 'Bow Attack';
            case 8:
                switch (skillData.z?.co) {
                case 1:
                    return 'Lead Attack';
                case 2:
                    return 'Off-Hand Attack';
                case 3:
                    return 'Dual Attack';
                default:
                    return 'Dagger Attack';
                }
            case 16:
                return 'Hammer Attack';
            case 32:
                return 'Scythe Attack';
            case 64:
                return 'Spear Attack';
            case 70:
                return 'Ranged Attack';
            case 128:
                return 'Sword Attack';
            }
            return 'Melee Attack';
        case 15:
            return 'Shout';
        case 19:
            return 'Preparation';
        case 20:
            return 'Pet Attack';
        case 21:
            return 'Trap';
        case 22:
            switch (skillData.p) {
            case Profession.Ritualist:
                return 'Binding Ritual';
            case Profession.Ranger:
                return 'Nature Ritual';
            default:
                return 'Ebon Vanguard Ritual';
            }
        case 24:
            return 'Item Spell';
        case 25:
            return 'Weapon Spell';
        case 26:
            return 'Form';
        case 27:
            return 'Chant';
        case 28:
            return 'Echo';
        default:
            return 'Skill';
        }
    }
}