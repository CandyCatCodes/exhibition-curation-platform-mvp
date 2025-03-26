const AIC_API_URL = "https://api.artic.edu/api/v1/artworks";
const HAM_API_URL = "https://api.harvardartmuseums.org/object";
const HAM_API_KEY = process.env.EXPO_PUBLIC_HARVARD_API_KEY;

export type ApiSource = "aic" | "ham";

export interface UnifiedArtwork {
  id: string;
  title: string;
  artist: string | null;
  imageUrl: string | null;
  source: ApiSource;
}

export interface UnifiedArtworkDetail extends UnifiedArtwork {
  description: string | null;
  dimensions: string | null;
  date: string | null;
  medium: string | null;
  sourceApiUrl?: string;
}

interface AicArtwork {
  id: number;
  title: string;
  artist_title: string | null;
  image_id: string | null;
}

interface AicApiResponse {
  pagination: {
    total: number;
    limit: number;
    offset: number;
    total_pages: number;
    current_page: number;
    next_url: string | null;
  };
  data: AicArtwork[];
  config: {
    iiif_url: string;
  };
}

interface HamPerson {
  name: string;
  role: string;
  personid: number;
}

interface HamImage {
  imageid: number;
  baseimageurl: string;
  iiifbaseuri?: string;
  width: number;
  height: number;
  publiccaption: string | null;
  displayorder: number;
}

interface HamArtworkRecord {
  id: number;
  objectid: number;
  objectnumber: string;
  title: string;
  people: HamPerson[] | null;
  dated: string | null;
  culture: string | null;
  medium: string | null;
  dimensions: string | null;
  description: string | null;
  primaryimageurl: string | null;
  images: HamImage[] | null;
  url: string;
}

interface HamInfo {
  totalrecordsperquery: number;
  totalrecords: number;
  pages: number;
  page: number;
  next?: string;
  prev?: string;
}

interface HamApiResponse {
  info: HamInfo;
  records: HamArtworkRecord[];
}

type HamApiDetailResponse = HamArtworkRecord;

const getAicImageUrl = (
  imageId: string | null,
  iiifUrl: string,
): string | null => {
  if (!imageId || !iiifUrl) {
    return null;
  }
  return `${iiifUrl}/${imageId}/full/843,/0/default.jpg`;
};

const getHamImageUrl = (artwork: HamArtworkRecord): string | null => {
  let baseUrl = artwork.primaryimageurl;
  if (!baseUrl && artwork.images && artwork.images.length > 0) {
    const sortedImages = [...artwork.images].sort(
      (a, b) => a.displayorder - b.displayorder,
    );
    baseUrl = sortedImages[0].baseimageurl;
  }

  if (!baseUrl) {
    return null;
  }

  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}width=800`;
};

const mapAicToUnified = (
  item: AicArtwork,
  iiifUrl: string,
): UnifiedArtwork => ({
  id: `aic-${item.id}`,
  title: item.title || "Untitled",
  artist: item.artist_title || null,
  imageUrl: getAicImageUrl(item.image_id, iiifUrl),
  source: "aic",
});

const mapHamToUnified = (item: HamArtworkRecord): UnifiedArtwork => ({
  id: `ham-${item.objectid}`,
  title: item.title || "Untitled",
  artist:
    item.people?.find((p) => p.role === "Artist")?.name ||
    item.people?.[0]?.name ||
    null,
  imageUrl: getHamImageUrl(item),
  source: "ham",
});

const getAicArtworks = async (
  page: number = 1,
  limit: number = 10,
): Promise<AicApiResponse> => {
  const fields = "id,title,artist_title,image_id";
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    fields: fields,
    "query[term][is_public_domain]": "true",
    "query[exists][field]": "image_id",
  });
  const url = `${AIC_API_URL}?${queryParams.toString()}`;

  console.log(`Fetching AIC artworks from: ${url}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`AIC API error! status: ${response.status}`);
    }
    const data: AicApiResponse = await response.json();
    console.log("Fetched AIC artworks:", data.data.length);
    return data;
  } catch (error) {
    console.error("Failed to fetch AIC artworks:", error);
    throw error;
  }
};

const getHamArtworks = async (
  page: number = 1,
  limit: number = 10,
): Promise<HamApiResponse> => {
  if (!HAM_API_KEY) {
    console.error(
      "Harvard API Key (EXPO_PUBLIC_HARVARD_API_KEY) is missing or undefined.",
    );
    throw new Error(
      "Harvard API Key is missing. Please check your .env file and restart the server.",
    );
  }
  const fields =
    "id,objectid,objectnumber,title,people,dated,culture,medium,dimensions,description,primaryimageurl,images,url";
  const queryParams = new URLSearchParams({
    apikey: HAM_API_KEY,
    page: String(page),
    size: String(limit),
    fields: fields,
    hasimage: "1",
  });
  const url = `${HAM_API_URL}?${queryParams.toString()}`;

  console.log(`Fetching HAM artworks from: ${url}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `HAM API error! status: ${response.status}, response: ${errorBody}`,
      );
      throw new Error(`HAM API error! status: ${response.status}`);
    }
    const data: HamApiResponse = await response.json();
    if ((data as any).error) {
      console.error("HAM API returned an error object:", (data as any).error);
      throw new Error(`HAM API returned error: ${(data as any).error}`);
    }
    console.log("Fetched HAM artworks:", data.records?.length || 0);
    if (!data.records) {
      data.records = [];
    }
    return data;
  } catch (error) {
    console.error("Failed to fetch or parse HAM artworks:", error);
    throw error;
  }
};

interface AicArtworkDetail extends AicArtwork {
  description: string | null;
  dimensions: string | null;
  date_display: string | null;
  medium_display: string | null;
}

interface AicApiDetailResponse {
  data: AicArtworkDetail;
  config: {
    iiif_url: string;
  };
}

const mapAicDetailToUnified = (
  item: AicArtworkDetail,
  iiifUrl: string,
): UnifiedArtworkDetail => ({
  ...mapAicToUnified(item, iiifUrl),
  description: item.description,
  dimensions: item.dimensions,
  date: item.date_display,
  medium: item.medium_display,
});

const mapHamDetailToUnified = (
  item: HamArtworkRecord,
): UnifiedArtworkDetail => ({
  ...mapHamToUnified(item),
  description: item.description,
  dimensions: item.dimensions,
  date: item.dated,
  medium: item.medium,
  sourceApiUrl: item.url,
});

const getAicArtworkDetails = async (
  id: string,
): Promise<AicApiDetailResponse> => {
  const fields =
    "id,title,artist_title,image_id,description,dimensions,date_display,medium_display";
  const url = `${AIC_API_URL}/${id}?fields=${fields}`;

  console.log(`Fetching AIC artwork details from: ${url}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`AIC API error! status: ${response.status}`);
    }
    const data: AicApiDetailResponse = await response.json();
    console.log("Fetched AIC artwork details for ID:", id);
    return data;
  } catch (error) {
    console.error(`Failed to fetch AIC artwork details for ID ${id}:`, error);
    throw error;
  }
};

export interface UnifiedArtworksResponse {
  artworks: UnifiedArtwork[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
  };
}

export const getArtworks = async (
  source: ApiSource | "all" = "all",
  page: number = 1,
  limit: number = 10,
): Promise<UnifiedArtworksResponse> => {
  let unifiedArtworks: UnifiedArtwork[] = [];
  let currentPage = page;
  let totalPages = 1;
  let totalRecords = 0;
  const resultsPerPage = limit;

  try {
    if (source === "aic" || source === "all") {
      const aicLimit = source === "all" ? Math.ceil(limit * 0.6) : limit;
      const aicPage = source === "all" ? 1 : page;
      console.log(`Requesting AIC: page=${aicPage}, limit=${aicLimit}`);
      const aicResponse = await getAicArtworks(aicPage, aicLimit);
      const mappedAic = aicResponse.data.map((item) =>
        mapAicToUnified(item, aicResponse.config.iiif_url),
      );
      unifiedArtworks = unifiedArtworks.concat(mappedAic);
      if (source === "aic") {
        currentPage = aicResponse.pagination.current_page;
        totalPages = aicResponse.pagination.total_pages;
        totalRecords = aicResponse.pagination.total;
      } else {
        totalRecords += aicResponse.pagination.total;
      }
    }

    if (source === "ham" || source === "all") {
      if (!HAM_API_KEY) {
        console.warn("Harvard API Key missing, skipping HAM source.");
      } else {
        try {
          const hamLimit = source === "all" ? Math.ceil(limit * 0.6) : limit;
          const hamPage = source === "all" ? 1 : page;
          console.log(`Requesting HAM: page=${hamPage}, limit=${hamLimit}`);
          const hamResponse = await getHamArtworks(hamPage, hamLimit);
          const mappedHam = hamResponse.records.map(mapHamToUnified);
          unifiedArtworks = unifiedArtworks.concat(mappedHam);
          if (source === "ham") {
            currentPage = hamResponse.info.page;
            totalPages = hamResponse.info.pages;
            totalRecords = hamResponse.info.totalrecords;
          } else {
            totalRecords += hamResponse.info.totalrecords;
          }
        } catch (hamError) {
          console.error(
            "Failed to fetch or process HAM artworks, proceeding without them:",
            hamError,
          );
          if (source === "all" && unifiedArtworks.length === 0) {
            throw hamError;
          }
        }
      }
    }

    if (source === "all") {
      unifiedArtworks.sort(() => Math.random() - 0.5);
      unifiedArtworks = unifiedArtworks.slice(0, limit);
      currentPage = 1;
      totalPages = Math.ceil(totalRecords / resultsPerPage);
    }
  } catch (error) {
    console.error(`Error fetching artworks for source '${source}':`, error);
    throw error;
  }

  console.log(
    `Returning ${unifiedArtworks.length} artworks. Pagination: page=${currentPage}, totalPages=${totalPages}, totalRecords=${totalRecords}`,
  );

  return {
    artworks: unifiedArtworks,
    pagination: { currentPage, totalPages, totalRecords },
  };
};

export const getArtworkDetails = async (
  prefixedId: string,
): Promise<UnifiedArtworkDetail> => {
  const parts = prefixedId.split("-");
  if (parts.length < 2) {
    console.error(`Invalid prefixed ID format: ${prefixedId}`);
    throw new Error(`Invalid prefixed ID format: ${prefixedId}`);
  }
  const source = parts[0] as ApiSource;
  const id = parts.slice(1).join("-");

  console.log(`Fetching details for source: ${source}, ID: ${id}`);

  try {
    if (source === "aic") {
      const aicResponse = await getAicArtworkDetails(id);
      return mapAicDetailToUnified(
        aicResponse.data,
        aicResponse.config.iiif_url,
      );
    } else if (source === "ham") {
      const hamResponse = await getHamArtworkDetails(id);
      return mapHamDetailToUnified(hamResponse);
    } else {
      console.error(`Unknown source in prefixed ID: ${source}`);
      throw new Error(`Unknown source in prefixed ID: ${source}`);
    }
  } catch (error) {
    console.error(`Failed to get details for ${prefixedId}:`, error);
    throw error;
  }
};

const getHamArtworkDetails = async (
  objectId: string,
): Promise<HamApiDetailResponse> => {
  if (!HAM_API_KEY) {
    console.error(
      "Harvard API Key (EXPO_PUBLIC_HARVARD_API_KEY) is missing or undefined.",
    );
    throw new Error("Harvard API Key is missing. Cannot fetch details.");
  }
  const fields =
    "id,objectid,objectnumber,title,people,dated,culture,medium,dimensions,description,primaryimageurl,images,url";
  const queryParams = new URLSearchParams({
    apikey: HAM_API_KEY,
    fields: fields,
  });
  const url = `${HAM_API_URL}/${objectId}?${queryParams.toString()}`;

  console.log(`Fetching HAM artwork details from: ${url}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `HAM API detail error! status: ${response.status}, response: ${errorBody}`,
      );
      throw new Error(`HAM API error! status: ${response.status}`);
    }
    const data: HamApiDetailResponse = await response.json();
    if ((data as any).error) {
      console.error(
        "HAM API detail returned an error object:",
        (data as any).error,
      );
      throw new Error(`HAM API returned error: ${(data as any).error}`);
    }
    console.log("Fetched HAM artwork details for ID:", objectId);
    return data;
  } catch (error) {
    console.error(
      `Failed to fetch or parse HAM artwork details for ID ${objectId}:`,
      error,
    );
    throw error;
  }
};
