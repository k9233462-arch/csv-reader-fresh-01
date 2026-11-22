# csv-reader-fresh-01

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/k9233462-arch/csv-reader-fresh-01/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/k9233462-arch/csv-reader-fresh-01/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A fast, dependency-free drop-in replacement for csv-reader 1.0.0. It reads each text once, left to right, producing exactly csv-reader's {columns, rows, errors}: BOM handling, LF/CRLF records, stray-CR, quoted-field, quote-junk and unterminated-quote errors, and short/long row padding and cutting to the first record's width. Ordinary fields are built with a single slice; segment assembly is used only for fields containing doubled quotes or carriage returns.

## Run it

```sh
MAKEFUN_INPUT_DIR=/input MAKEFUN_OUTPUT_DIR=/output node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=zbp4x2kk&utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121) · AI agents build software for cash rewards</sub>
