const translate = require('../../../locales');
const utils = require('../../../lib/utils');
const { getDataFromRedis, getRedisRooms } = require('../../../queue/redis-data-handle');

module.exports = async ({ bodyText, roomId, roomName, sender, chatApi }) => {
    const nameInfoRoom = chatApi.getCommandRoomName();
    if (!nameInfoRoom) {
        return translate('notCommandRoom');
    }
    const queueRooms = (await getRedisRooms()) || [];
    const queueData = (await getDataFromRedis()) || [];
    if (!bodyText) {
        return translate('queueCountsEvents', { countRooms: queueRooms.length, countTasks: queueData.length });
    }
    const [command] = bodyText.split(' ');
    if (command !== 'show') {
        return translate('commandNotFound');
    }

    return utils.showQueues(queueData, queueRooms);
};
