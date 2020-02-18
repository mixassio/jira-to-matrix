const defaultConfig = require('../../src/config');
const nock = require('nock');
const utils = require('../../src/lib/utils.js');
const { matrix } = require('../fixtures/messenger-settings');
const commandHandler = require('../../src/bot/timeline-handler');

const JSONbody = require('../fixtures/webhooks/issue/created.json');
const issueBodyJSON = require('../fixtures/jira-api-requests/issue.json');
const watchersBody = require('../fixtures/jira-api-requests/watchers.json');

const { getDataFromRedis, getRedisRooms } = require('../../src/queue/redis-data-handle');

const { getFuncAndBody } = require('../../src/jira-hook-parser/bot-handler');
const { saveIncoming } = require('../../src/queue/redis-data-handle.js');

const { getChatApi, cleanRedis } = require('../test-utils');
const translate = require('../../src/locales');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const { expect } = chai;
chai.use(sinonChai);

describe('Queue test', () => {
    let chatApi;
    let baseOptions;

    const commandName = 'queue';
    const roomName = 'someRoomName';

    describe('No command room in config', () => {
        beforeEach(() => {
            chatApi = getChatApi();
            baseOptions = { roomName, commandName, chatApi };
        });

        it('Expect return error message if room is not command', async () => {
            const result = await commandHandler(baseOptions);

            expect(result).to.be.eq(translate('notCommandRoom'));
        });
    });

    describe('command room in config exists', () => {
        const matrixMessengerDataWithRoom = { ...matrix, infoRoom: { name: 'roomName' } };
        const configWithInfo = { ...defaultConfig, messenger: matrixMessengerDataWithRoom };

        beforeEach(async () => {
            chatApi = getChatApi({
                config: configWithInfo,
            });
            baseOptions = { roomName, commandName, chatApi };
            const parsedBody = getFuncAndBody(JSONbody);
            await Promise.all(parsedBody.map(saveIncoming));

            nock(utils.getRestUrl())
                .get(`/issue/${JSONbody.issue.key}`)
                .times(4)
                .reply(200, issueBodyJSON)
                .get(`/issue/${JSONbody.issue.key}/watchers`)
                .times(4)
                .reply(200, watchersBody);
        });
        afterEach(async () => {
            await cleanRedis();
        });

        it('Expect return only !queue without params for special project rooms', async () => {
            // project rooms are not includes!!!
            const body = translate('queueCountsEvents', { countRooms: 1, countTasks: 1 });
            const result = await commandHandler({
                ...baseOptions,
            });
            expect(result).to.be.eq(body);
        });

        it('Expect return !queue notexistnamecommand with params not exist for special project rooms', async () => {
            // project rooms are not includes!!!
            const body = translate('commandNotFound');
            const result = await commandHandler({
                ...baseOptions,
                bodyText: 'notexistnamecommand',
            });
            expect(result).to.be.eq(body);
        });

        it('Expect return !queue show with params show for special project rooms', async () => {
            const result = await commandHandler({
                ...baseOptions,
                bodyText: 'show',
            });
            const queueRooms = await getRedisRooms();
            const queueData = await getDataFromRedis();
            const messageRooms = queueRooms
                .map((name, id) => `<strong>${id + 1})</strong> - ${JSON.stringify(name)}`)
                .join('<br>');
            const messageTasks = queueData
                .map((name, id) => `<strong>${id + 1})</strong> - ${JSON.stringify(name)}`)
                .join('<br>');
            const body = translate('showAllQueue', { messageRooms, messageTasks });
            expect(result).to.be.eq(body);
        });
    });
});
