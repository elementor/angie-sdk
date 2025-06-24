<?php
/**
 * Post Type Manager Feature
 * 
 * Handles post type registration and management functionality for the Angie Demo plugin
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Angie_Demo_Post_Type_Manager {

	/**
	 * Constructor
	 */
	public function __construct() {
		add_action( 'init', [ $this, 'register_stored_post_types' ] );
	}

	/**
	 * Register REST API routes for post type management
	 */
	public function register_rest_routes() {
		register_rest_route( Angie_Demo_Plugin::REST_NAMESPACE, '/post-types', [
			'methods' => 'POST',
			'callback' => [ $this, 'register_post_type' ],
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
	 * Register a new post type
	 *
	 * @param WP_REST_Request $request The REST request object.
	 * @return array|WP_Error
	 */
	public function register_post_type( $request ) {
		$params = $request->get_json_params();
		$post_type = $params['postType'] ?? '';
		$action = $params['action'] ?? 'register';

		if ( empty( $post_type ) ) {
			return new WP_Error( 'missing_post_type', 'Post type parameter is required', [ 'status' => 400 ] );
		}

		// Handle unregister action
		if ( $action === 'unregister' ) {
			return $this->handle_unregister_post_type( $post_type );
		}

		// Handle register action (default)
		if ( $action !== 'register' ) {
			return new WP_Error( 'invalid_action', 'Action must be either "register" or "unregister"', [ 'status' => 400 ] );
		}

		// Check if post type already exists
		if ( post_type_exists( $post_type ) ) {
			return [
				'success' => false,
				'message' => sprintf( 'Post type "%s" already exists', $post_type ),
				'post_type' => $post_type,
			];
		}

		// Check if post type is already stored in options
		$stored_post_types = $this->get_stored_post_types();
		if ( isset( $stored_post_types[ $post_type ] ) ) {
			return [
				'success' => false,
				'message' => sprintf( 'Post type "%s" is already configured and will be registered on next page load', $post_type ),
				'post_type' => $post_type,
			];
		}

		// Define post type labels
		$labels = [
			'name' => ucfirst( $post_type ),
			'singular_name' => ucfirst( $post_type ),
			'add_new' => 'Add New',
			'add_new_item' => 'Add New ' . ucfirst( $post_type ),
			'edit_item' => 'Edit ' . ucfirst( $post_type ),
			'new_item' => 'New ' . ucfirst( $post_type ),
			'view_item' => 'View ' . ucfirst( $post_type ),
			'search_items' => 'Search ' . ucfirst( $post_type ) . 's',
			'not_found' => 'No ' . $post_type . 's found',
			'not_found_in_trash' => 'No ' . $post_type . 's found in trash',
		];

		// Define post type arguments
		$args = [
			'labels' => $labels,
			'public' => true,
			'has_archive' => true,
			'supports' => [ 'title', 'editor', 'thumbnail', 'excerpt' ],
			'show_in_rest' => true,
		];

		// Store the post type configuration
		$update_result = $this->store_post_type_config( $post_type, $args );

		if ( ! $update_result ) {
			return new WP_Error( 'storage_failed', 'Failed to store post type configuration', [ 'status' => 500 ] );
		}

		// Register the post type immediately for current request
		$result = register_post_type( $post_type, $args );

		if ( is_wp_error( $result ) ) {
			// Remove from stored options if registration failed
			$this->remove_post_type_config( $post_type );
			
			return new WP_Error( 'registration_failed', 'Failed to register post type: ' . $result->get_error_message(), [ 'status' => 500 ] );
		}

		// Flush rewrite rules to make the new post type accessible
		flush_rewrite_rules();

		return [
			'success' => true,
			'message' => sprintf( 'Post type "%s" configured and registered successfully. It will be automatically registered on future page loads.', $post_type ),
			'post_type' => $post_type,
			'labels' => $labels,
			'args' => $args,
		];
	}

	/**
	 * Handle unregistering a post type
	 *
	 * @param string $post_type The post type to unregister.
	 * @return array|WP_Error
	 */
	private function handle_unregister_post_type( $post_type ) {
		$stored_post_types = $this->get_stored_post_types();
		if ( ! isset( $stored_post_types[ $post_type ] ) ) {
			return [
				'success' => false,
				'message' => sprintf( 'Post type "%s" is not configured', $post_type ),
				'post_type' => $post_type,
			];
		}

		$removed = $this->remove_post_type_config( $post_type );

		if ( ! $removed ) {
			return new WP_Error( 'removal_failed', 'Failed to remove post type configuration', [ 'status' => 500 ] );
		}

		return [
			'success' => true,
			'message' => sprintf( 'Post type "%s" configuration removed successfully. It will no longer be registered on future page loads.', $post_type ),
			'post_type' => $post_type,
		];
	}

	/**
	 * Register all stored post types
	 */
	public function register_stored_post_types() {
		$post_types = get_option( Angie_Demo_Plugin::POST_TYPES_OPTION, [] );
		foreach ( $post_types as $post_type => $config ) {
			if ( ! post_type_exists( $post_type ) ) {
				register_post_type( $post_type, $config );
			}
		}
	}

	/**
	 * Get all stored post type configurations
	 *
	 * @return array
	 */
	private function get_stored_post_types() {
		return get_option( Angie_Demo_Plugin::POST_TYPES_OPTION, [] );
	}

	/**
	 * Store a post type configuration
	 *
	 * @param string $post_type The post type name.
	 * @param array  $args The post type arguments.
	 * @return bool
	 */
	private function store_post_type_config( $post_type, $args ) {
		$stored_post_types = $this->get_stored_post_types();
		$stored_post_types[ $post_type ] = $args;
		return update_option( Angie_Demo_Plugin::POST_TYPES_OPTION, $stored_post_types );
	}

	/**
	 * Remove a post type configuration
	 *
	 * @param string $post_type The post type name.
	 * @return bool
	 */
	private function remove_post_type_config( $post_type ) {
		$stored_post_types = $this->get_stored_post_types();
		if ( isset( $stored_post_types[ $post_type ] ) ) {
			unset( $stored_post_types[ $post_type ] );
			return update_option( Angie_Demo_Plugin::POST_TYPES_OPTION, $stored_post_types );
		}
		return false;
	}
} 