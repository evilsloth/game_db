# Game DB

Maps IGDB id to games stores ids:
- Steam
- GOG
- Epic Games store
- Amazon Prime Gaming

## Usage

`npm start` - starts simple nodejs service for querying games

To query for games call the `/games` service, e.g.:

GET `http://localhost:4000/games?id=123`

Supported query params:
- `id` - IGDB id
- `steamId` - Steam id
- `gogId` - GOG id
- `epicId` - EGS id
- `amazonId` - Amazon Prime Gaming id

Multiple ids can be provided with following formats:
- `?id=1,2,3`
- `?id=1&id=2&id=3`

## Update DB

To update DB define environment variables:
- `CLIENT_ID` - IGDB client id
- `ACCESS_TOKEN` - IGDB api access token

and then start the update with:

`npm run update`

