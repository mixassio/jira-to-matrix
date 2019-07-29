Документ описывает алгоритм работы приложения, составные части и взаимодействие между ними, процедуру инициализации и обработки данных.

1. Инициализация приложения
 + [Компоненты приложения](#AppComponents)
 + [Порядок старта]()
2. Получение и обработка вебхуков от Jira
 + [Типы обрабатываемых хуков и настройка]()
 + [Политики игнорирования хуков и её настройка]()
 + [Парсинг хуков]()
 + [Добавление данных на обработку в очередь Reddis]()
3. Обработка данных в очереди Reddis
 + [Добавление/удаление данных в/из Redis]()
 + [Вызов функций из очереди Reddis и обработка данных]()
4. ChatBot - отправка сообщений в Matrix по событиям Jira
 + []()
5. ChatBot - обработка комманд от пользователя
 + []()

Инициализация приложения
========================
<a name="AppComponents"></a> Копоненты приложения
--------------------

+ веб-сервер, на который приходят хуки от Jira
+ клиент к мессенджеру (Matrix)
+ очередь событий на обработку Redis
+ FSM управляющая всем зоопарком

Порядок старта
--------------

Старт всех компанент и их рестрат (при необходимости) завязаны на `State Mashine`.

Описание логики:
```
описание логики кода
```

Получение и обработка вебхуков от Jira
======================================

Хуки принимаются на веб-сервере express
```
 .../src/jira-app.js

...

.post('/', async (req, res, next) => {
            logger.info('Webhook received! Start getting ignore status');
            logger.silly('Jira body', req.body);

            const saveStatus = await getParsedAndSaveToRedis(req.body);

            if (saveStatus) {
                await handleFunc();
            }

            next();
        })
...

```
Хуки обрабатываются в два этапа:

1. `getParsedAndSaveToRedis(req.body)` обрабатывает хук (проверяет на игнор, парсит, сохраняет в очередь)
2. если предыдущий шаг `true` то `await handleFunc()` переводит конечный автомат в состояние "Хук обработан".

Обработка хуков в `getParsedAndSaveToRedis(req.body)`
-------------------------------------

Каждый хук проходит через этапы:
```
.../src/jira-hook-parser/index.js

...

module.exports = async body => {
    try {
        if (await isIgnore(body)) {
            return;
        }

        const parsedBody = getFuncAndBody(body);
        await Promise.all(parsedBody.map(saveIncoming));

        return true;
    } catch (err) {
        logger.error('Error in parsing ', err);

        return false;
    }
};
    ...
```

1. Проверка на игнорирование хука `await isIgnore(body)`
2. Сборка списка необходимых действий (функций с данными) для очереди Reddis `parsedBody = getFuncAndBody(body)`
3. Сохранение списка действий в Reddis `await Promise.all(parsedBody.map(saveIncoming));`

### Игнорирование хуков




Обработка данных в очереди Reddis
=================================

## Добавление/удаление данных в/из Redis

1. Добавление ключей и данных в Реддис

```
.../src/jira-hook-parser.js
...
module.exports = async body => {
    try {
        if (await isIgnore(body)) {
            return;
        }

        const parsedBody = getFuncAndBody(body);
        await Promise.all(parsedBody.map(saveIncoming));

        return true;
    } catch (err) {
        logger.error('Error in parsing ', err);

        return false;
    }
};
```
В функцию `saveIncoming` поступают данные из распарсенного хука и записываются в Реддис:

```
await redis.setAsync(redisKey, bodyToJSON);
```

2. Удаление ключей и данных из Реддис

После успешной отработки функций, ключи удаляются из Реддис
```
handleRedisData

await bot[funcName]({...data, chatApi});
await redis.delAsync(redisKey);
```
```
handleRedisRooms

await bot.createRoom({...data, chatApi});
await redis.delAsync(REDIS_ROOM_KEY);
```

В этих двух функциях перехватываются ошибки когда комната не создана, в этом случае вызывается функция, которая перезаписывает ключи в Реддис:
```
const rewriteRooms = async createRoomData => {
    try {
        const bodyToJSON = JSON.stringify(createRoomData);

        await redis.setAsync(REDIS_ROOM_KEY, bodyToJSON);
        logger.info('Rooms data rewrited by redis.');
    } catch (err) {
        throw ['Error while rewrite rooms in redis:', err].join('\n');
    }
};
```

## Вызов функций из очереди Reddis и обработка данных

Данные из Redis обрабатываются так:

```
.../src/queue/index.js

module.exports = async client => {
    try {
        const redisRooms = await getRedisRooms();
        await handleRedisRooms(client, redisRooms);

        const dataFromRedis = await getDataFromRedis();
        await handleRedisData(client, dataFromRedis);
    } catch (err) {
        logger.error('Error in queue handling', err);
    }
};
```

Данные условно делятся на два типа:

+ Создание комнаты (или изменение)
```
const redisRooms = await getRedisRooms();
await handleRedisRooms(client, redisRooms);
```
+ Остальные Хуки (комменты, ссылки, приглашение юзеров - все эти события могут быть вызваны при созданной комнате)
```
const dataFromRedis = await getDataFromRedis();
await handleRedisData(client, dataFromRedis);
```
Сначала выбираются данные, уже сохраненные в реддис и к ним добавляются свежие данные.

Этот код вызывается при:

1. Старте приложения
```
...
async onHandleQueue() {
    logger.debug('Start queue handling');
    await handler(chatApi);
...

// output to logs:
7/24/2019, 2:45:50 PM,557 - info: [messenger-api] well connected
7/24/2019, 2:45:50 PM,559 - debug: [/fsm/index.js] Chat connected
7/24/2019, 2:45:50 PM,560 - debug: [/fsm/index.js] Start queue handling
```

2. После отработки хука

```
.../src/jira-app.js

...

    if (saveStatus) {
        await handleFunc();
    }
...
```
```
.../src/fsm/index.js
this.jiraFsm = getJiraFsm(app(this.handleHook.bind(this)), port);
    }

/**
* Handling Jira hook
*/
async handleHook() {
    this.jiraFsm.hookResponsed();
    await this._handle();
}
/**
 * Handling redis data
 */
async _handle() {
    if (this.chatFSM.can('handleQueue')) {
        this.jiraFsm.handlingInProgress();
        await this.chatFSM.handleQueue();
        this.chatFSM.finishHandle();
        this.jiraFsm.is('hookResponsed') && await this._handle();
    }
}

```



ChatBot - отправка сообщений в Matrix по событиям Jira
======================================================



ChatBot - обработка комманд от пользователя
===========================================


