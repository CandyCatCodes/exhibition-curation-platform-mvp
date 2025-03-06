// Using Art Institute of Chicago (AIC) API as an example
const AIC_API_URL = 'https://api.artic.edu/api/v1/artworks';

// Basic artwork info for list view
export interface Artwork {
  id: number;
  title: string;
  artist_title: string | null;
  image_id: string | null; // Needed to construct image URL
}

// Define the structure of the API response for a list of artworks
interface ApiResponse {
  pagination: {
    total: number;
    limit: number;
    offset: number;
    total_pages: number;
    current_page: number;
    next_url: string | null;
  };
  data: Artwork[];
  config: {
    iiif_url: string; // Base URL for images
  };
}

/**
 * Fetches a list of artworks from the AIC API.
 * @param page - The page number to fetch.
 * @param limit - The number of items per page.
 * @returns Promise resolving to the API response structure.
 */
export const getArtworks = async (page: number = 1, limit: number = 10): Promise<ApiResponse> => {
  // Construct the query URL
  // Fetch only public domain artworks with images for now
  // Request specific fields to reduce payload size
  const fields = 'id,title,artist_title,image_id';
  const url = `${AIC_API_URL}?page=${page}&limit=${limit}&fields=${fields}`;
  // Example filter for public domain: &query[term][is_public_domain]=true
  // Example filter for artworks with images: &query[exists][field]=image_id

  console.log(`Fetching artworks from: ${url}`); // For debugging

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: ApiResponse = await response.json();
    console.log('Fetched artworks:', data.data.length); // For debugging
    return data;
  } catch (error) {
    console.error("Failed to fetch artworks:", error);
    // Re-throw the error to be handled by the calling component
    throw error;
  }
};

/**
 * Constructs the full image URL for an artwork.
 * @param imageId - The image_id from the artwork data.
 * @param iiifUrl - The base IIIF URL from the API config.
 * @returns The full image URL string.
 */
export const getImageUrl = (imageId: string | null, iiifUrl: string): string | null => {
  if (!imageId || !iiifUrl) {
    return null;
  }
  // Construct the URL using the IIIF standard format
  // Example: {iiif_url}/{image_id}/full/843,/0/default.jpg (requesting max 843px width)
  return `${iiifUrl}/${imageId}/full/843,/0/default.jpg`; // Request a larger size (e.g., 843px width) for detail view
};

// Define a more detailed type for the single artwork response
export interface ArtworkDetail extends Artwork {
  // Inherits id, title, artist_title, image_id from Artwork
  description: string | null; // Often HTML, might need parsing/sanitizing
  dimensions: string | null;
  date_display: string | null;
  medium_display: string | null;
  // Add other fields as needed, e.g., provenance_text, credit_line, etc.
}

// Define the structure of the API response for a single artwork
interface ApiDetailResponse {
  data: ArtworkDetail;
  config: {
    iiif_url: string; // Base URL for images
  };
}

/**
 * Fetches details for a single artwork from the AIC API.
 * @param id - The ID of the artwork to fetch.
 * @returns Promise resolving to the detailed artwork data.
 */
export const getArtworkDetails = async (id: string): Promise<ApiDetailResponse> => {
  // Request specific fields relevant to the detail view
  const fields = 'id,title,artist_title,image_id,description,dimensions,date_display,medium_display';
  const url = `${AIC_API_URL}/${id}?fields=${fields}`;

  console.log(`Fetching artwork details from: ${url}`); // For debugging

  try {
    const response = await fetch(url);
    if (!response.ok) {
      // Handle 404 specifically?
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: ApiDetailResponse = await response.json();
    console.log('Fetched artwork details for ID:', id); // For debugging
    return data;
  } catch (error) {
    console.error(`Failed to fetch artwork details for ID ${id}:`, error);
    throw error; // Re-throw to be handled by the component
  }
};
