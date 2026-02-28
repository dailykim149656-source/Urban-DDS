# Public Data Debug Endpoint

## Purpose
`/api/debug/public-data` quickly inspects external API health for:
- apartment trade (`RTMSDataSvcAptTrade`)
- building title (`BldRgstHubService/getBrTitleInfo`)
- building recap (`BldRgstHubService/getBrRecapTitleInfo`)

It returns HTTP status, body length, JSON parse status, `resultCode/resultMsg`, and parsed item count.

## Endpoint
- `GET /api/debug/public-data`

## Query Parameters
- `mode`: `all` | `trade` | `building-title` | `building-recap` (default: `all`)
- `sigunguCd`: default `11680`
- `bjdongCd`: optional
- `bun`: optional
- `ji`: optional
- `lawdCd`: default = `sigunguCd`
- `dealYmd`: default = current `YYYYMM`
- `numOfRows`: default `10`
- `pageNo`: default `1`

## Examples
- all probes:
`/api/debug/public-data?mode=all&sigunguCd=11680`

- trade only:
`/api/debug/public-data?mode=trade&lawdCd=11680&dealYmd=202601`

- building title with lot params:
`/api/debug/public-data?mode=building-title&sigunguCd=11680&bjdongCd=10300&bun=0012&ji=0000`

## Notes
- `serviceKey` is loaded from `.env` and masked in returned request URLs.
- If building APIs return `bodyLength=0` with `httpStatus=200`, likely issue is service access/approval or provider-side response behavior.
