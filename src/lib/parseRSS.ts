import { XMLParser } from "fast-xml-parser";

export interface FeedRow {
  unixTime: number;
  newsHeadline: string;
  publisher: string;
}

/** Parse and process the RSS XML.
 * @param xmlUrl - URL or path to XML file
 */
export async function parseRSS(xmlUrl: string): Promise<string> {
  const res = await fetch(xmlUrl);
  const xml = await res.text();

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
  });

  const data = parser.parse(xml);
  const entries = data?.rss?.channel?.item ?? [];

  const parsed: FeedRow[] = entries.map((entry: any) => {
    let publisher = entry?.source?.["url"];
    let newsHeadline = entry?.title;
    let published = entry?.pubDate;

    publisher = publisher.replace("https://", "").replace("www.", "");

    newsHeadline = newsHeadline.replace(/\n/g, "");
    newsHeadline = newsHeadline.split(" - ").slice(0, -1).join(" ");
    newsHeadline = newsHeadline.split("|")[0].trim();
    newsHeadline = newsHeadline.split(/\s+/).join(" ");

    published = published.replace(" GMT", "");
    const dt = new Date(published + " UTC");
    const unixTime = Math.floor(dt.getTime() / 1000);

    return { unixTime, newsHeadline, publisher };
  });

  parsed.sort((a, b) => b.unixTime - a.unixTime);

  const output = parsed
    .map((r) =>
      [r.unixTime, r.newsHeadline, r.publisher]
        .map((v) => (typeof v === "string" ? JSON.stringify(v) : v))
        .join(",")
    )
    .join("\n");

  console.log(output);
  return output;
}
