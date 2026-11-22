// Fast drop-in replacement for csv-reader 1.0.0.
// Single left-to-right pass. Ordinary fields are produced with one slice;
// a segment list is only assembled when a field actually contains a
// doubled quote, a carriage return, or stray CRs that must be dropped.

export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const n = text.length;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;
  let line = 1;
  let pos = n > 0 && text.charCodeAt(0) === 0xfeff ? 1 : 0;

  // Record currently being read; errors are stamped with these.
  let recLine = 1;
  let recRow = null;

  // Append text[a..b) to parts, converting CRLF and lone CR to LF and
  // counting every line break in `line`. Only used on slow paths.
  function pushConverted(parts, a, b) {
    if (a >= b) return;
    const r = text.indexOf("\r", a);
    if (r === -1 || r >= b) {
      parts.push(text.slice(a, b));
      let i = a;
      for (;;) {
        const li = text.indexOf("\n", i);
        if (li === -1 || li >= b) break;
        line += 1;
        i = li + 1;
      }
      return;
    }
    let start = a;
    let i = a;
    while (i < b) {
      const c = text.charCodeAt(i);
      if (c === 13) {
        if (i > start) parts.push(text.slice(start, i));
        parts.push("\n");
        line += 1;
        i += i + 1 < b && text.charCodeAt(i + 1) === 10 ? 2 : 1;
        // A CRLF split across the segment end still counts once; the
        // caller never splits inside a CRLF of the quoted content.
        start = i;
      } else {
        if (c === 10) line += 1;
        i += 1;
      }
    }
    if (b > start) parts.push(text.slice(start, b));
  }

  // Read an unquoted run starting at pos, prefixed by `prefix` ("" for a
  // plain field, '"' for an unterminated quote re-read, or the quoted
  // value for trailing junk). Returns [value, ended, added] where
  // ended: 0 = comma, 1 = line break, 2 = end of text, and added is the
  // number of characters this call kept (drives quote_junk).
  function readPlain(prefix) {
    const origin = pos;
    let added = 0;
    let parts = null;
    let seg = pos;
    for (;;) {
      let i = seg;
      while (i < n) {
        const c = text.charCodeAt(i);
        if (c === 44 || c === 10 || c === 13) break;
        i += 1;
      }
      added += i - seg;
      if (i >= n) {
        pos = i;
        if (parts === null) return [prefix + text.slice(origin, i), 2, added];
        parts.push(text.slice(seg, i));
        return [parts.join(""), 2, added];
      }
      const c = text.charCodeAt(i);
      if (c === 44) {
        pos = i + 1;
        if (parts === null) return [prefix + text.slice(origin, i), 0, added];
        parts.push(text.slice(seg, i));
        return [parts.join(""), 0, added];
      }
      if (c === 10) {
        pos = i + 1;
        line += 1;
        if (parts === null) return [prefix + text.slice(origin, i), 1, added];
        parts.push(text.slice(seg, i));
        return [parts.join(""), 1, added];
      }
      // c === 13
      if (i + 1 < n && text.charCodeAt(i + 1) === 10) {
        pos = i + 2;
        line += 1;
        if (parts === null) return [prefix + text.slice(origin, i), 1, added];
        parts.push(text.slice(seg, i));
        return [parts.join(""), 1, added];
      }
      // Stray CR: dropped, error recorded, reading continues.
      errors.push({ code: "stray_cr", line: recLine, row: recRow });
      if (parts === null) {
        parts = [prefix];
        if (i > origin) parts.push(text.slice(origin, i));
      } else if (i > seg) {
        parts.push(text.slice(seg, i));
      }
      pos = i + 1;
      seg = pos;
    }
  }

  for (;;) {
    // Blank lines are not records.
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 10) {
        pos += 1;
        line += 1;
      } else if (c === 13 && pos + 1 < n && text.charCodeAt(pos + 1) === 10) {
        pos += 2;
        line += 1;
      } else break;
    }
    if (pos >= n) break;

    recLine = line;
    recRow = header && columns === null ? null : rows.length;
    const fields = [];
    let lastQuoted = false;
    let ended = 2;

    for (;;) {
      lastQuoted = false;
      let value;
      if (pos < n && text.charCodeAt(pos) === 34) {
        lastQuoted = true;
        const open = pos;
        const openLine = line;
        let parts = null;
        let seg = open + 1;
        let scan = seg;
        let close = -1;
        // Find the closing quote; "" is an escaped quote, not the end.
        for (;;) {
          const q = text.indexOf('"', scan);
          if (q === -1) break;
          if (q + 1 < n && text.charCodeAt(q + 1) === 34) {
            if (parts === null) parts = [];
            pushConverted(parts, seg, q);
            parts.push('"');
            scan = q + 2;
            seg = scan;
            continue;
          }
          close = q;
          break;
        }
        if (close === -1) {
          // Never closed: the quote is literal and the rest is re-read
          // as an unquoted field.
          line = openLine;
          errors.push({ code: "unterminated_quote", line: recLine, row: recRow });
          pos = open + 1;
          const r = readPlain('"');
          value = r[0];
          ended = r[1];
          fields.push(value);
          if (ended !== 0) break;
          continue;
        }
        if (parts === null) {
          const r = seg < close ? text.indexOf("\r", seg) : -1;
          if (r === -1 || r >= close) {
            value = text.slice(seg, close);
            let i = seg;
            for (;;) {
              const li = text.indexOf("\n", i);
              if (li === -1 || li >= close) break;
              line += 1;
              i = li + 1;
            }
          } else {
            parts = [];
            pushConverted(parts, seg, close);
            value = parts.join("");
          }
        } else {
          pushConverted(parts, seg, close);
          value = parts.join("");
        }
        pos = close + 1;
        if (pos >= n) {
          ended = 2;
        } else {
          const c = text.charCodeAt(pos);
          if (c === 44) {
            pos += 1;
            ended = 0;
          } else if (c === 10) {
            pos += 1;
            line += 1;
            ended = 1;
          } else if (c === 13 && pos + 1 < n && text.charCodeAt(pos + 1) === 10) {
            pos += 2;
            line += 1;
            ended = 1;
          } else {
            // Junk after the closing quote, appended as it stands.
            const r = readPlain(value);
            value = r[0];
            ended = r[1];
            if (r[2] > 0) errors.push({ code: "quote_junk", line: recLine, row: recRow });
          }
        }
      } else {
        const r = readPlain("");
        value = r[0];
        ended = r[1];
      }
      fields.push(value);
      if (ended !== 0) break;
    }

    // A line that held only stray CRs leaves a single empty unquoted
    // field: it is no record (its stray_cr errors stay).
    if (fields.length === 1 && fields[0] === "" && !lastQuoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: "short_row", line: recLine, row: recRow, fields: fields.length });
      while (fields.length < width) fields.push("");
    } else if (fields.length > width) {
      errors.push({ code: "long_row", line: recLine, row: recRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }

  return { columns: header ? columns ?? [] : null, rows, errors };
}
