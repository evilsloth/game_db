import { createServer } from 'http';
import { parse } from 'url';
import fs from 'fs';
import { toMap } from './utils.js';

const PORT = process.env.PORT || 4000;

const games = JSON.parse(fs.readFileSync('db.json'));
const gamesById = toMap(games, (item) => item.id.toString());
const gamesBySteamId = toMap(games, (item) => item.steamId?.toString());
const gamesByGogId = toMap(games, (item) => item.gogId?.toString());
const gamesByEpicId = toMap(games, (item) => item.epicId?.toString());
const gamesByAmazonId = toMap(games, (item) => item.amazonId?.toString());

const server = createServer((req, res) => {
    try {
        const parsedUrl = parse(req.url, true);
        const query = parsedUrl.query;
        const path = parsedUrl.pathname;
        const method = req.method.toUpperCase();

        if (method === 'GET' && path === '/games') {
            const gamesSet = new Set();

            addGames(gamesSet, gamesById, query.id);
            addGames(gamesSet, gamesBySteamId, query.steamId);
            addGames(gamesSet, gamesByGogId, query.gogId);
            addGames(gamesSet, gamesByEpicId, query.epicId);
            addGames(gamesSet, gamesByAmazonId, query.amazonId);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(Array.from(gamesSet)));
        } else {
            res.writeHead(404);
            res.end();
        }
    } catch (e) {
        console.log(e);
        res.writeHead(400);
        res.end();
    }
});

server.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));

function addGames(gamesSet, gamesMap, queryParams) {
    if (queryParams == null) {
        return;
    }

    const ids = Array.isArray(queryParams) ? queryParams : queryParams.split(",");
    ids.forEach(id => {
        const found = gamesMap.get(id);
        if (found) {
            gamesSet.add(found);
        }
    });
}
