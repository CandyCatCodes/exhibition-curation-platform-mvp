// --- Constants ---
const AIC_API_URL = 'https://api.artic.edu/api/v1/artworks';
const HAM_API_URL = 'https://api.harvardartmuseums.org/object';
// Ensure the variable name matches the one in your .env file
const HAM_API_KEY = process.env.EXPO_PUBLIC_HARVARD_API_KEY;

// --- Source Identifiers ---
export type ApiSource = 'aic' | 'ham';

// --- Unified Data Structures ---
// Used for lists and details to provide a consistent interface to components
export interface UnifiedArtwork {
  id: string; // Prefixed with source, e.g., "aic-123", "ham-456"
  title: string;
  artist: string | null;
  imageUrl: string | null;
  source: ApiSource;
  // Include raw data for potential future use or debugging? Optional.
  // rawData: any;
}

export interface UnifiedArtworkDetail extends UnifiedArtwork {
  description: string | null;
  dimensions: string | null;
  date: string | null;
  medium: string | null;
  sourceApiUrl?: string; // Link back to the source record if available
}


// --- AIC Specific Types ---
interface AicArtwork {
  id: number;
  title: string;
  artist_title: string | null;
  image_id: string | null;
}

// Define the structure of the API response for a list of artworks from AIC
interface AicApiResponse {
  pagination: {
    total: number;
    limit: number;
    offset: number;
    total_pages: number;
    current_page: number;
    next_url: string | null;
  };
  data: AicArtwork[]; // Changed Artwork[] to AicArtwork[]
  config: {
    iiif_url: string; // Base URL for images
  };
}


// --- HAM Specific Types ---
interface HamPerson {
    name: string;
    role: string;
    personid: number;
}

interface HamImage {
    imageid: number;
    baseimageurl: string; // Use this for basic image display
    iiifbaseuri?: string; // Optional IIIF
    width: number;
    height: number;
    publiccaption: string | null;
    displayorder: number;
}

interface HamArtworkRecord {
    id: number;
    objectid: number; // Use this as the primary ID? API docs use objectid in URLs
    objectnumber: string;
    title: string;
    people: HamPerson[] | null;
    dated: string | null;
    culture: string | null;
    medium: string | null;
    dimensions: string | null;
    description: string | null;
    primaryimageurl: string | null; // Often same as images[0].baseimageurl
    images: HamImage[] | null;
    url: string; // Link back to HAM website record
    // Add other fields as needed
}

interface HamInfo {
    totalrecordsperquery: number;
    totalrecords: number;
    pages: number;
    page: number;
    next?: string; // URL for next page
    prev?: string; // URL for prev page
}

interface HamApiResponse {
    info: HamInfo;
    records: HamArtworkRecord[];
}

// HAM Detail response is just a single record (no 'data' wrapper like AIC)
type HamApiDetailResponse = HamArtworkRecord;


// --- Helper Functions ---

/**
 * Constructs the full image URL for an AIC artwork.
 * @param imageId - The image_id from the artwork data.
 * @param iiifUrl - The base IIIF URL from the API config.
 * @returns The full image URL string.
 */
const getAicImageUrl = (imageId: string | null, iiifUrl: string): string | null => {
  if (!imageId || !iiifUrl) {
    return null;
  }
  // Use a reasonable size for both list and detail for simplicity now
  return `${iiifUrl}/${imageId}/full/843,/0/default.jpg`;
};

/**
 * Gets the primary image URL for a HAM artwork, potentially resizing.
 * @param artwork - The HAM artwork record.
 * @returns The image URL string or null.
 */
const getHamImageUrl = (artwork: HamArtworkRecord): string | null => {
    let baseUrl = artwork.primaryimageurl;
    // Fallback to the first image in the images array if primary is missing
    if (!baseUrl && artwork.images && artwork.images.length > 0) {
        // Sort by displayorder just in case, though primary should be first
        const sortedImages = [...artwork.images].sort((a, b) => a.displayorder - b.displayorder);
        baseUrl = sortedImages[0].baseimageurl;
    }

    if (!baseUrl) {
        return null;
    }

    // Add resizing parameters (e.g., width=800) - adjust size as needed
    // Check if URL already has query params
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}width=800`; // Request 800px width
};


// --- Mapping Functions ---

const mapAicToUnified = (item: AicArtwork, iiifUrl: string): UnifiedArtwork => ({
    id: `aic-${item.id}`,
    title: item.title || 'Untitled',
    artist: item.artist_title || null,
    imageUrl: getAicImageUrl(item.image_id, iiifUrl),
    source: 'aic',
});

const mapHamToUnified = (item: HamArtworkRecord): UnifiedArtwork => ({
    id: `ham-${item.objectid}`, // Use objectid as it's used in detail URLs
    title: item.title || 'Untitled',
    // Find the primary artist (often role "Artist")
    artist: item.people?.find(p => p.role === 'Artist')?.name || item.people?.[0]?.name || null,
    imageUrl: getHamImageUrl(item),
    source: 'ham',
});


// --- API Fetching Functions (Internal) ---

/**
 * Fetches a list of artworks from the AIC API.
 * @param page - The page number to fetch.
 * @param limit - The number of items per page.
 * @returns Promise resolving to the AIC API response structure.
 */
const getAicArtworks = async (page: number = 1, limit: number = 10): Promise<AicApiResponse> => {
  // Construct the query URL
  // Fetch only public domain artworks with images for now
  // Request specific fields to reduce payload size
  const fields = 'id,title,artist_title,image_id';
  // Add filters for public domain and having an image
  const queryParams = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      fields: fields,
      'query[term][is_public_domain]': 'true',
      'query[exists][field]': 'image_id'
  });
  const url = `${AIC_API_URL}?${queryParams.toString()}`;

  console.log(`Fetching AIC artworks from: ${url}`); // For debugging

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`AIC API error! status: ${response.status}`);
    }
    const data: AicApiResponse = await response.json();
    console.log('Fetched AIC artworks:', data.data.length); // For debugging
    return data;
  } catch (error) {
    console.error("Failed to fetch AIC artworks:", error);
    // Re-throw the error to be handled by the calling component
    throw error;
  }
};


/**
 * Fetches a list of artworks from the HAM API.
 * @param page - The page number to fetch.
 * @param limit - The number of items per page.
 * @returns Promise resolving to the HAM API response structure.
 */
const getHamArtworks = async (page: number = 1, limit: number = 10): Promise<HamApiResponse> => {
    if (!HAM_API_KEY) {
        console.error("Harvard API Key (EXPO_PUBLIC_HARVARD_API_KEY) is missing or undefined.");
        throw new Error("Harvard API Key is missing. Please check your .env file and restart the server.");
    }
    // Request specific fields
    // Note: HAM uses 'size' instead of 'limit'
    const fields = 'id,objectid,objectnumber,title,people,dated,culture,medium,dimensions,description,primaryimageurl,images,url';
    const queryParams = new URLSearchParams({
        apikey: HAM_API_KEY,
        page: String(page),
        size: String(limit),
        fields: fields,
        // Add filters - e.g., must have an image
        hasimage: '1',
        // verificationlevel: '4', // Only fully verified records? Optional.
        // sort: 'rank', // Default sort
        // sortorder: 'desc'
    });
    const url = `${HAM_API_URL}?${queryParams.toString()}`;

    console.log(`Fetching HAM artworks from: ${url}`); // For debugging

    try {
        const response = await fetch(url);
        if (!response.ok) {
            // Log more details on HAM API error
            const errorBody = await response.text();
            console.error(`HAM API error! status: ${response.status}, response: ${errorBody}`);
            throw new Error(`HAM API error! status: ${response.status}`);
        }
        const data: HamApiResponse = await response.json();
        // Handle cases where HAM API returns success but with an error message inside (rare)
        if ((data as any).error) {
             console.error("HAM API returned an error object:", (data as any).error);
             throw new Error(`HAM API returned error: ${(data as any).error}`);
        }
        console.log('Fetched HAM artworks:', data.records?.length || 0); // Safely access length
        // Ensure records is always an array, even if API returns null/undefined
        if (!data.records) {
            data.records = [];
        }
        return data;
    } catch (error) {
        console.error("Failed to fetch or parse HAM artworks:", error);
        throw error;
    }
};


// --- AIC Specific Detail Types ---
interface AicArtworkDetail extends AicArtwork {
  description: string | null; // Often HTML, might need parsing/sanitizing
  dimensions: string | null;
  date_display: string | null;
  medium_display: string | null;
}

interface AicApiDetailResponse {
  data: AicArtworkDetail;
  config: {
    iiif_url: string; // Base URL for images
  };
}

// --- Mapping Functions for Details ---

const mapAicDetailToUnified = (item: AicArtworkDetail, iiifUrl: string): UnifiedArtworkDetail => ({
    ...mapAicToUnified(item, iiifUrl), // Reuse base mapping
    description: item.description, // May contain HTML, handle in component
    dimensions: item.dimensions,
    date: item.date_display,
    medium: item.medium_display,
    // sourceApiUrl: // AIC doesn't provide a direct web URL in standard response
});

const mapHamDetailToUnified = (item: HamArtworkRecord): UnifiedArtworkDetail => ({
    ...mapHamToUnified(item), // Reuse base mapping
    description: item.description,
    dimensions: item.dimensions,
    date: item.dated,
    medium: item.medium,
    sourceApiUrl: item.url,
});


// --- API Fetching Functions for Details (Internal) ---

/**
 * Fetches details for a single artwork from the AIC API.
 * @param id - The ID of the artwork to fetch (numeric part only).
 * @returns Promise resolving to the detailed AIC artwork data.
 */
const getAicArtworkDetails = async (id: string): Promise<AicApiDetailResponse> => {
  // Request specific fields relevant to the detail view
  const fields = 'id,title,artist_title,image_id,description,dimensions,date_display,medium_display';
  const url = `${AIC_API_URL}/${id}?fields=${fields}`;

  console.log(`Fetching AIC artwork details from: ${url}`); // For debugging

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`AIC API error! status: ${response.status}`);
    }
    const data: AicApiDetailResponse = await response.json();
    console.log('Fetched AIC artwork details for ID:', id); // For debugging
    return data;
  } catch (error) {
    console.error(`Failed to fetch AIC artwork details for ID ${id}:`, error);
        throw error; // Re-throw to be handled by the component
    }
};


// --- Public Service Functions ---

// Define structure for the combined list response
export interface UnifiedArtworksResponse {
    artworks: UnifiedArtwork[];
    pagination: {
        currentPage: number;
        totalPages: number; // Represents total pages for the *specific source* if not 'all'
        totalRecords: number; // Represents total records for the *specific source* if not 'all'
    };
}

/**
 * Fetches artworks from specified sources and returns them in a unified format.
 * For 'all', currently fetches page 1 from both and combines.
 * Proper pagination across combined sources is complex and deferred.
 * @param source - The API source ('aic', 'ham', or 'all').
 * @param page - The page number (primarily for single-source fetching).
 * @param limit - Items per page (applied to each source if 'all').
 */
export const getArtworks = async (
    source: ApiSource | 'all' = 'all',
    page: number = 1,
    limit: number = 10
): Promise<UnifiedArtworksResponse> => {
    let unifiedArtworks: UnifiedArtwork[] = [];
    let currentPage = page;
    let totalPages = 1;
    let totalRecords = 0;
    const resultsPerPage = limit; // Use the limit for calculations

    try {
        if (source === 'aic' || source === 'all') {
            // Fetch slightly more from AIC if 'all' to compensate for potential HAM failures/fewer results
            const aicLimit = source === 'all' ? Math.ceil(limit * 0.6) : limit;
            const aicPage = source === 'all' ? 1 : page; // Always fetch page 1 for 'all'
            console.log(`Requesting AIC: page=${aicPage}, limit=${aicLimit}`);
            const aicResponse = await getAicArtworks(aicPage, aicLimit);
            const mappedAic = aicResponse.data.map(item => mapAicToUnified(item, aicResponse.config.iiif_url));
            unifiedArtworks = unifiedArtworks.concat(mappedAic);
            if (source === 'aic') {
                currentPage = aicResponse.pagination.current_page;
                totalPages = aicResponse.pagination.total_pages;
                totalRecords = aicResponse.pagination.total;
            } else { // 'all' source
                 // For 'all', pagination is simplified/approximated
                 totalRecords += aicResponse.pagination.total; // Add to total
                 // totalPages = Math.max(totalPages, aicResponse.pagination.total_pages); // This isn't quite right for combined
            }
        }

        if (source === 'ham' || source === 'all') {
             if (!HAM_API_KEY) {
                console.warn("Harvard API Key missing, skipping HAM source.");
             } else {
                try {
                    // Fetch slightly more from HAM if 'all'
                    const hamLimit = source === 'all' ? Math.ceil(limit * 0.6) : limit;
                    const hamPage = source === 'all' ? 1 : page; // Always fetch page 1 for 'all'
                    console.log(`Requesting HAM: page=${hamPage}, limit=${hamLimit}`);
                    const hamResponse = await getHamArtworks(hamPage, hamLimit);
                    const mappedHam = hamResponse.records.map(mapHamToUnified);
                    unifiedArtworks = unifiedArtworks.concat(mappedHam);
                    if (source === 'ham') {
                        currentPage = hamResponse.info.page;
                        totalPages = hamResponse.info.pages;
                        totalRecords = hamResponse.info.totalrecords;
                    } else { // 'all' source
                        totalRecords += hamResponse.info.totalrecords; // Add to total
                        // totalPages = Math.max(totalPages, hamResponse.info.pages); // Still not quite right
                    }
                } catch (hamError) {
                    console.error("Failed to fetch or process HAM artworks, proceeding without them:", hamError);
                    // Optionally inform the user via state if HAM fails in 'all' mode
                    if (source === 'all' && unifiedArtworks.length === 0) {
                        // If AIC also failed or returned nothing, re-throw
                        throw hamError;
                    }
                    // Otherwise, continue with just AIC results if available
                }
             }
        }

         // Shuffle results for 'all' source to mix them up
        if (source === 'all') {
            unifiedArtworks.sort(() => Math.random() - 0.5);
            // Trim to the requested limit after combining and shuffling
            unifiedArtworks = unifiedArtworks.slice(0, limit);
            // Pagination for 'all' is simplified: always page 1, totalPages estimated roughly
            currentPage = 1;
            // Estimate total pages based on combined records and limit - very rough!
            totalPages = Math.ceil(totalRecords / resultsPerPage);
        }

    } catch (error) {
        console.error(`Error fetching artworks for source '${source}':`, error);
        // Depending on requirements, maybe return partial results or throw
        throw error; // Re-throw for now
    }

    console.log(`Returning ${unifiedArtworks.length} artworks. Pagination: page=${currentPage}, totalPages=${totalPages}, totalRecords=${totalRecords}`);

    return {
        artworks: unifiedArtworks,
        pagination: { currentPage, totalPages, totalRecords }
    };
};


/**
 * Fetches details for a single artwork from the specified source.
 * @param prefixedId - The ID prefixed with source (e.g., "aic-123", "ham-456").
 * @returns Promise resolving to the detailed unified artwork data.
 */
export const getArtworkDetails = async (prefixedId: string): Promise<UnifiedArtworkDetail> => {
    const parts = prefixedId.split('-');
    if (parts.length < 2) {
        console.error(`Invalid prefixed ID format: ${prefixedId}`);
        throw new Error(`Invalid prefixed ID format: ${prefixedId}`);
    }
    const source = parts[0] as ApiSource;
    const id = parts.slice(1).join('-'); // Join back in case ID had hyphens (less likely for these APIs)

    console.log(`Fetching details for source: ${source}, ID: ${id}`);

    try {
        if (source === 'aic') {
            const aicResponse = await getAicArtworkDetails(id);
            return mapAicDetailToUnified(aicResponse.data, aicResponse.config.iiif_url);
        } else if (source === 'ham') {
            // HAM uses the objectId for detail fetching
            const hamResponse = await getHamArtworkDetails(id);
            return mapHamDetailToUnified(hamResponse);
        } else {
            // Should not happen if source type is enforced, but good fallback.
             console.error(`Unknown source in prefixed ID: ${source}`);
            throw new Error(`Unknown source in prefixed ID: ${source}`);
        }
    } catch (error) {
         console.error(`Failed to get details for ${prefixedId}:`, error);
         // Re-throw the error to be handled by the calling component
         throw error;
    }
};


// Remove or comment out the old getImageUrl if no longer needed directly by components
/*
export const getImageUrl = (imageId: string | null, iiifUrl: string): string | null => {
  // ... old implementation ...
};
*/


/**
 * Fetches details for a single artwork from the HAM API.
 * @param objectId - The object ID of the artwork to fetch (numeric part only).
 * @returns Promise resolving to the detailed HAM artwork data.
 */
const getHamArtworkDetails = async (objectId: string): Promise<HamApiDetailResponse> => {
    if (!HAM_API_KEY) {
         console.error("Harvard API Key (EXPO_PUBLIC_HARVARD_API_KEY) is missing or undefined.");
        throw new Error("Harvard API Key is missing. Cannot fetch details.");
    }
    // Request specific fields relevant to the detail view
    const fields = 'id,objectid,objectnumber,title,people,dated,culture,medium,dimensions,description,primaryimageurl,images,url';
     const queryParams = new URLSearchParams({
        apikey: HAM_API_KEY,
        fields: fields,
    });
    // HAM uses object ID directly in the URL path
    const url = `${HAM_API_URL}/${objectId}?${queryParams.toString()}`;

    console.log(`Fetching HAM artwork details from: ${url}`); // For debugging

    try {
        const response = await fetch(url);
        if (!response.ok) {
             const errorBody = await response.text();
             console.error(`HAM API detail error! status: ${response.status}, response: ${errorBody}`);
            throw new Error(`HAM API error! status: ${response.status}`);
        }
        // HAM detail response is the record itself, not wrapped in 'data'
        const data: HamApiDetailResponse = await response.json();
         if ((data as any).error) {
             console.error("HAM API detail returned an error object:", (data as any).error);
             throw new Error(`HAM API returned error: ${(data as any).error}`);
        }
        console.log('Fetched HAM artwork details for ID:', objectId); // For debugging
        return data;
    } catch (error) {
        console.error(`Failed to fetch or parse HAM artwork details for ID ${objectId}:`, error);
    throw error; // Re-throw to be handled by the component
  }
};
