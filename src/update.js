import fs from 'fs';
import { toMap, defaultValue } from './utils.js';

const PAGE_SIZE = 500;

const metadata = JSON.parse(fs.readFileSync('metadata.json'));
const dbMap = toMap(JSON.parse(fs.readFileSync('db.json')), (item) => item.id);

const queryStart = "fields id, name, slug, aggregated_rating, rating, updated_at, "
    + "cover.image_id, "
    + "external_games.category, external_games.uid, external_games.url, "
    + "websites.category, websites.url; "
    + `where updated_at > ${metadata.igdbLastSynced};`
    + "sort updated_at; ";

let lastSyncedAt = metadata.igdbLastSynced;
let offset = 0;
let count = 0;
let changed = false;

do {
    const query = queryStart + `limit ${PAGE_SIZE}; offset ${offset};`;
    const response = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        body: query,
        headers: {
            'Content-type': 'application/json',
            'Client-ID': process.env.CLIENT_ID,
            "Authorization": "Bearer " + process.env.ACCESS_TOKEN
        }
    });
    const body = await response.json();

    for (const item of body) {
        dbMap.set(item.id, await mapGame(dbMap.get(item.id), item));
    }

    count = +response.headers.get('x-count');
    lastSyncedAt = body[body.length - 1]?.updated_at || lastSyncedAt;
    console.log(`Progress: ${offset}/${count} (${count != 0 ? (offset / count * 100).toFixed(2) : '0.00'}%)`);

    if (body.length > 0) {
        changed = true;
    }

    offset += PAGE_SIZE;
} while (offset < count);

console.log(`Progress: ${count}/${count} (100.00%)`);

if (changed) {
    console.log('Saving db. Entry count: ' + dbMap.size);
    const newDb = [...dbMap.values()].sort((a, b) => a.id - b.id);
    fs.writeFileSync('db.json', JSON.stringify(newDb, null, 2));

    const newMetadata = { version: metadata.version + 1, igdbLastSynced: lastSyncedAt };
    console.log(`Saving metadata. Version: ${newMetadata.version}, last updated record time: ${newMetadata.igdbLastSynced}`);
    fs.writeFileSync('metadata.json', JSON.stringify(newMetadata, null, 2));
} else {
    console.log('Nothing changed from last update!');
}

async function mapGame(existingGame, igdbGame) {
    const epicSlug = getEpicSlug(igdbGame);
    const epicId = epicSlug != null ? await getEpicId(epicSlug) : null;

    return {
        id: igdbGame.id,
        slug: igdbGame.slug,
        name: defaultValue(existingGame?.name, igdbGame.name),
        imageId: defaultValue(existingGame?.imageId, igdbGame.cover?.image_id),
        steamId: defaultValue(existingGame?.steamId, getExternalId(igdbGame, 1)),
        gogId: defaultValue(existingGame?.gogId, getExternalId(igdbGame, 5)),
        epicSlug: defaultValue(existingGame?.epicSlug, epicSlug),
        epicId: defaultValue(existingGame?.epicId, epicId),
        amazonId: defaultValue(existingGame?.amazonId, null), // any way to get amazon prime games product ids?
        rating: igdbGame.aggregated_rating,
        userRating: igdbGame.rating
    };
}

function getExternalId(igdbGame, category) {
    const externalGames = igdbGame.external_games || [];
    return externalGames.find(game => game.category === category)?.uid;
}

function getEpicSlug(igdbGame) {
    const externalGameUrl = igdbGame.external_games?.find(game => game.category === 26)?.url;

    if (externalGameUrl != null) {
        return getSlug(externalGameUrl);
    }

    const websitesGameUrl = igdbGame.websites?.find(website => website.url?.includes('epicgames'))?.url;
    if (websitesGameUrl != null) {
        return getSlug(websitesGameUrl);
    }

    return null;
}

async function getEpicId(epicSlug) {
    const url = 'https://store.epicgames.com/graphql'
        + '?operationName=getMappingByPageSlug'
        + `&variables={%22pageSlug%22:%22${epicSlug}%22,%22locale%22:%22en%22}`
        + '&extensions={%22persistedQuery%22:{%22version%22:1,%22sha256Hash%22:%22781fd69ec8116125fa8dc245c0838198cdf5283e31647d08dfa27f45ee8b1f30%22}}';
    const response = await fetch(url);

    try {
        const body = await response.json();
        return body?.data?.StorePageMapping?.mapping?.productId;
    } catch (e) {
        console.log('Error getting epic id for slug: ' + epicSlug);
        console.log(e);
        console.log(response);
        return null;
    }
}

function getSlug(url) {
    const urlWithoutQueryParams = url.split('?')[0];
    const parts = urlWithoutQueryParams.split('/');
    return parts.pop() || parts.pop();
}