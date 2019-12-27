const faker = require('faker');

const slack = {
    name: 'slack',
    admins: ['jira_test'],
    domain: faker.internet.domainName(),
    eventPort: 3001,
    user: 'jirabot',
    password: faker.random.uuid(),
    bots: [
        {
            user: 'jirabot',
            password: faker.random.uuid(),
        },
    ],
};

const matrix = {
    name: 'matrix',
    admins: ['jira_test'],
    domain: 'matrix.test-example.ru',
    user: 'jira_test_bot',
    password: 'fakepasswprd',
    bots: [
        {
            user: 'jira_test_bot',
            password: 'fakepasswprd',
        },
    ],
};

module.exports = Object.freeze({
    port: 4300,
    lang: faker.random.arrayElement(['ru', 'en']),
    jira: {
        url: 'https://jira.test-example.ru/jira',
        user: 'jira_test_bot',
        password: 'fakepasswprd',
    },
    features: {
        createRoom: true,
        inviteNewMembers: true,
        postComments: true,
        postIssueUpdates: true,
        epicUpdates: {
            newIssuesInEpic: 'on',
            issuesStatusChanged: 'on',
            field: 'customfield_10006',
            fieldAlias: 'Epic Link',
        },
        newLinks: true,
        postChangesToLinks: {
            on: true,
            // Not to post to closed issues (3 - id of status category "Done")
            ignoreDestStatusCat: [3],
        },
    },
    // useful for testing, add a test user into production config
    usersToIgnore: ['ivan_prod'],
    testMode: {
        on: true,
        users: ['ivan', 'jira_test'],
    },
    redis: {
        host: '127.0.0.1',
        port: 6379,
        prefix: 'test-jira-hooks:',
    },
    messenger: faker.random.arrayElement([slack, matrix]),
    log: {
        type: 'console',
        filePath: 'logs/service',
        fileLevel: 'silly',
        consoleLevel: 'debug',
    },
    ping: {
        interval: 10,
        count: 10,
    },
    colors: {
        links: {
            purple: 'mxc://matrix.example/purple',
            green: 'mxc://matrix.example/green',
            yellow: 'mxc://matrix.example/yellow',
            'blue-gray': 'mxc://matrix.example/blue-gray',
            issue: 'mxc://matrix.example/blue-gray',
        },
        projects: ['TEST'],
    },
});
