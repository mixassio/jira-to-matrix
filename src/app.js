const conf = require('./config');
const getChatApi = require('./messengers');
const getLogger = require('./modules/log');
const logger = getLogger(module);
const commandsHandler = require('./bot/timeline-handler');
const FSM = require('./fsm');
const app = require('./jira-app');
const queueHandler = require('../src/queue');

const ChatApi = getChatApi(conf.messenger.name);
const apiCollection = conf.messenger.bots.map(item =>
    new ChatApi({config: {...conf.messenger, ...item}, commandsHandler, logger: getLogger('messenger-api')})
);

const fsm = new FSM(apiCollection, queueHandler, app, conf.port);

fsm.start();

const onExit = err => {
    logger.warn('Jira Bot stopped ', err);
    fsm.stop();

    process.exit(1);
};

process.on('exit', onExit);
process.on('SIGINT', onExit);
process.on('uncaughtException', onExit);
