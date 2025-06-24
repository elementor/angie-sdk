<?php
/**
 * SEO Analyzer Feature
 * 
 * Handles SEO analysis functionality for the Angie Demo plugin
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Angie_Demo_SEO_Analyzer {

	/**
	 * Constructor
	 */
	public function __construct() {
		// Feature initialization if needed
	}

	/**
	 * Register REST API routes for SEO analysis
	 */
	public function register_rest_routes() {
		register_rest_route( Angie_Demo_Plugin::REST_NAMESPACE, '/analyze-page-seo', [
			'methods' => 'POST',
			'callback' => [ $this, 'analyze_page_seo' ],
			'permission_callback' => [ $this, 'permissions_check' ],
		] );
	}

	/**
	 * Check if user has permission to execute tools
	 *
	 * @return bool
	 */
	public function permissions_check() {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Analyze page SEO
	 *
	 * @param WP_REST_Request $request The REST request object.
	 * @return array|WP_Error
	 */
	public function analyze_page_seo( $request ) {
		$params = $request->get_json_params();
		$url = $params['url'] ?? '';

		if ( empty( $url ) ) {
			return new WP_Error( 'missing_url', 'URL parameter is required', [ 'status' => 400 ] );
		}

		$content = $this->fetch_page_content( $url );
		if ( is_wp_error( $content ) ) {
			return $content;
		}

		$analysis = [
			'url' => $url,
			'meta_analysis' => $this->extract_meta_tags( $content ),
			'heading_analysis' => $this->extract_headings( $content ),
			'content_analysis' => $this->analyze_content( $content ),
			'recommendations' => [],
		];

		$analysis['recommendations'] = $this->generate_recommendations( $analysis );

		return $analysis;
	}

	/**
	 * Fetch page content
	 *
	 * @param string $url The URL to fetch.
	 * @return string|WP_Error
	 */
	private function fetch_page_content( $url ) {
		if ( strpos( $url, \home_url() ) === 0 ) {
			$post_id = \url_to_postid( $url );
			if ( $post_id ) {
				$post = \get_post( $post_id );
				if ( $post ) {
					$content = \apply_filters( 'the_content', $post->post_content );
					return $this->get_full_page_html( $post_id, $content );
				}
			}
		}

		$url_parts = parse_url( $url );
		$url_host = $url_parts['host'];
		$url_port = $url_parts['port'] ?? 80;

		$is_localhost = $url_host === 'localhost';

		if ( $is_localhost ) {
			$ping_docker_host = @fsockopen( 'host.docker.internal', $url_port );
			if ( $ping_docker_host ) {
				$url = str_replace( 'localhost', 'host.docker.internal', $url );
				fclose( $ping_docker_host );
			}
		}

		$response = \wp_remote_get( $url, [
			'timeout' => 30,
			'user-agent' => 'Angie Demo SEO Bot/1.0',
			'sslverify' => false,
		] );

		if ( \is_wp_error( $response ) ) {
			return new \WP_Error( 'fetch_failed', 'Failed to fetch page content: ' . $response->get_error_message(), [ 'status' => 500 ] );
		}

		$body = \wp_remote_retrieve_body( $response );
		if ( empty( $body ) ) {
			return new \WP_Error( 'empty_content', 'Page content is empty', [ 'status' => 500 ] );
		}

		return $body;
	}

	/**
	 * Get full page HTML for local posts
	 *
	 * @param int    $post_id The post ID.
	 * @param string $content The post content.
	 * @return string
	 */
	private function get_full_page_html( $post_id, $content ) {
		$post = get_post( $post_id );
		$title = get_the_title( $post_id );
		$meta_description = get_post_meta( $post_id, '_yoast_wpseo_metadesc', true );

		$html = '<!DOCTYPE html><html><head>';
		$html .= '<title>' . esc_html( $title ) . '</title>';
		if ( $meta_description ) {
			$html .= '<meta name="description" content="' . esc_attr( $meta_description ) . '">';
		}
		$html .= '</head><body>';
		$html .= '<h1>' . esc_html( $title ) . '</h1>';
		$html .= $content;
		$html .= '</body></html>';

		return $html;
	}

	/**
	 * Extract meta tags from HTML content
	 *
	 * @param string $html The HTML content.
	 * @return array
	 */
	private function extract_meta_tags( $html ) {
		$meta_tags = [
			'title' => '',
			'description' => '',
			'keywords' => '',
			'og_title' => '',
			'og_description' => '',
			'twitter_title' => '',
			'twitter_description' => '',
		];

		if ( preg_match( '/<title[^>]*>(.*?)<\/title>/is', $html, $matches ) ) {
			$meta_tags['title'] = trim( wp_strip_all_tags( $matches[1] ) );
		}

		if ( preg_match( '/<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']*)["\'][^>]*>/i', $html, $matches ) ) {
			$meta_tags['description'] = trim( $matches[1] );
		}

		if ( preg_match( '/<meta[^>]*name=["\']keywords["\'][^>]*content=["\']([^"\']*)["\'][^>]*>/i', $html, $matches ) ) {
			$meta_tags['keywords'] = trim( $matches[1] );
		}

		if ( preg_match( '/<meta[^>]*property=["\']og:title["\'][^>]*content=["\']([^"\']*)["\'][^>]*>/i', $html, $matches ) ) {
			$meta_tags['og_title'] = trim( $matches[1] );
		}

		if ( preg_match( '/<meta[^>]*property=["\']og:description["\'][^>]*content=["\']([^"\']*)["\'][^>]*>/i', $html, $matches ) ) {
			$meta_tags['og_description'] = trim( $matches[1] );
		}

		if ( preg_match( '/<meta[^>]*name=["\']twitter:title["\'][^>]*content=["\']([^"\']*)["\'][^>]*>/i', $html, $matches ) ) {
			$meta_tags['twitter_title'] = trim( $matches[1] );
		}

		if ( preg_match( '/<meta[^>]*name=["\']twitter:description["\'][^>]*content=["\']([^"\']*)["\'][^>]*>/i', $html, $matches ) ) {
			$meta_tags['twitter_description'] = trim( $matches[1] );
		}

		return [
			'tags' => $meta_tags,
			'analysis' => [
				'title_length' => strlen( $meta_tags['title'] ),
				'description_length' => strlen( $meta_tags['description'] ),
				'has_keywords' => ! empty( $meta_tags['keywords'] ),
				'has_og_tags' => ! empty( $meta_tags['og_title'] ) || ! empty( $meta_tags['og_description'] ),
				'has_twitter_tags' => ! empty( $meta_tags['twitter_title'] ) || ! empty( $meta_tags['twitter_description'] ),
			],
		];
	}

	/**
	 * Extract headings from HTML content
	 *
	 * @param string $html The HTML content.
	 * @return array
	 */
	private function extract_headings( $html ) {
		$headings = [];

		if ( preg_match_all( '/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/is', $html, $matches, PREG_SET_ORDER ) ) {
			foreach ( $matches as $match ) {
				$level = (int) $match[1];
				$text = trim( wp_strip_all_tags( $match[2] ) );
				$headings[] = [
					'level' => $level,
					'text' => $text,
					'length' => strlen( $text ),
				];
			}
		}

		$h1_count = count( array_filter( $headings, function( $h ) { return $h['level'] === 1; } ) );
		$has_proper_hierarchy = $this->check_heading_hierarchy( $headings );

		return [
			'headings' => $headings,
			'analysis' => [
				'total_headings' => count( $headings ),
				'h1_count' => $h1_count,
				'has_h1' => $h1_count > 0,
				'multiple_h1' => $h1_count > 1,
				'proper_hierarchy' => $has_proper_hierarchy,
				'heading_distribution' => array_count_values( array_column( $headings, 'level' ) ),
			],
		];
	}

	/**
	 * Check if heading hierarchy is proper
	 *
	 * @param array $headings The headings array.
	 * @return bool
	 */
	private function check_heading_hierarchy( $headings ) {
		$prev_level = 0;
		foreach ( $headings as $heading ) {
			$current_level = $heading['level'];
			if ( $prev_level > 0 && $current_level > $prev_level + 1 ) {
				return false;
			}
			$prev_level = $current_level;
		}
		return true;
	}

	/**
	 * Analyze content for SEO
	 *
	 * @param string $html The HTML content.
	 * @return array
	 */
	private function analyze_content( $html ) {
		$text = wp_strip_all_tags( $html );
		$word_count = str_word_count( $text );

		$images = [];
		$images_without_alt = 0;
		if ( preg_match_all( '/<img[^>]*>/i', $html, $img_matches ) ) {
			foreach ( $img_matches[0] as $img_tag ) {
				$has_alt = preg_match( '/alt=["\']([^"\']*)["\']/', $img_tag, $alt_match );
				$alt_text = $has_alt ? trim( $alt_match[1] ) : '';

				$images[] = [
					'tag' => $img_tag,
					'has_alt' => $has_alt,
					'alt_text' => $alt_text,
				];

				if ( ! $has_alt || empty( $alt_text ) ) {
					$images_without_alt++;
				}
			}
		}

		$internal_links = 0;
		$external_links = 0;
		if ( preg_match_all( '/<a[^>]*href=["\']([^"\']*)["\'][^>]*>/i', $html, $link_matches ) ) {
			foreach ( $link_matches[1] as $href ) {
				if ( strpos( $href, home_url() ) === 0 || strpos( $href, '/' ) === 0 ) {
					$internal_links++;
				} else {
					$external_links++;
				}
			}
		}

		return [
			'word_count' => $word_count,
			'character_count' => strlen( $text ),
			'images' => [
				'total' => count( $images ),
				'without_alt' => $images_without_alt,
				'alt_coverage' => count( $images ) > 0 ? ( count( $images ) - $images_without_alt ) / count( $images ) * 100 : 100,
			],
			'links' => [
				'internal' => $internal_links,
				'external' => $external_links,
				'total' => $internal_links + $external_links,
			],
		];
	}

	/**
	 * Generate SEO recommendations
	 *
	 * @param array $analysis The analysis data.
	 * @return array
	 */
	private function generate_recommendations( $analysis ) {
		$recommendations = [];

		if ( empty( $analysis['meta_analysis']['tags']['title'] ) ) {
			$recommendations[] = [
				'type' => 'error',
				'category' => 'meta_tags',
				'message' => 'Missing page title. Add a descriptive title tag.',
			];
		} elseif ( $analysis['meta_analysis']['analysis']['title_length'] < 30 ) {
			$recommendations[] = [
				'type' => 'warning',
				'category' => 'meta_tags',
				'message' => 'Title is too short. Aim for 30-60 characters.',
			];
		} elseif ( $analysis['meta_analysis']['analysis']['title_length'] > 60 ) {
			$recommendations[] = [
				'type' => 'warning',
				'category' => 'meta_tags',
				'message' => 'Title is too long. Keep it under 60 characters.',
			];
		}

		if ( empty( $analysis['meta_analysis']['tags']['description'] ) ) {
			$recommendations[] = [
				'type' => 'error',
				'category' => 'meta_tags',
				'message' => 'Missing meta description. Add a compelling description.',
			];
		} elseif ( $analysis['meta_analysis']['analysis']['description_length'] < 120 ) {
			$recommendations[] = [
				'type' => 'warning',
				'category' => 'meta_tags',
				'message' => 'Meta description is too short. Aim for 120-160 characters.',
			];
		} elseif ( $analysis['meta_analysis']['analysis']['description_length'] > 160 ) {
			$recommendations[] = [
				'type' => 'warning',
				'category' => 'meta_tags',
				'message' => 'Meta description is too long. Keep it under 160 characters.',
			];
		}

		if ( ! $analysis['heading_analysis']['analysis']['has_h1'] ) {
			$recommendations[] = [
				'type' => 'error',
				'category' => 'headings',
				'message' => 'Missing H1 tag. Add a main heading to your page.',
			];
		} elseif ( $analysis['heading_analysis']['analysis']['multiple_h1'] ) {
			$recommendations[] = [
				'type' => 'warning',
				'category' => 'headings',
				'message' => 'Multiple H1 tags found. Use only one H1 per page.',
			];
		}

		if ( ! $analysis['heading_analysis']['analysis']['proper_hierarchy'] ) {
			$recommendations[] = [
				'type' => 'warning',
				'category' => 'headings',
				'message' => 'Improper heading hierarchy. Use headings in sequential order (H1, H2, H3, etc.).',
			];
		}

		if ( $analysis['content_analysis']['word_count'] < 300 ) {
			$recommendations[] = [
				'type' => 'warning',
				'category' => 'content',
				'message' => 'Content is too short. Aim for at least 300 words for better SEO.',
			];
		}

		if ( $analysis['content_analysis']['images']['without_alt'] > 0 ) {
			$recommendations[] = [
				'type' => 'warning',
				'category' => 'images',
				'message' => sprintf( '%d images are missing alt text. Add descriptive alt attributes.', $analysis['content_analysis']['images']['without_alt'] ),
			];
		}

		if ( ! $analysis['meta_analysis']['analysis']['has_og_tags'] ) {
			$recommendations[] = [
				'type' => 'info',
				'category' => 'social',
				'message' => 'Add Open Graph tags for better social media sharing.',
			];
		}

		if ( ! $analysis['meta_analysis']['analysis']['has_twitter_tags'] ) {
			$recommendations[] = [
				'type' => 'info',
				'category' => 'social',
				'message' => 'Add Twitter Card tags for better Twitter sharing.',
			];
		}

		return $recommendations;
	}
} 