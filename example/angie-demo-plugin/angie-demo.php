<?php
/**
 * Plugin Name: Angie Demo - MCP Tools
 * Description: Demonstrates how to create external MCP tools for Angie AI assistant
 * Version: 1.0.0
 * Author: Elementor.com
 * Plugin URI: https://elementor.com/
 * Author URI: https://elementor.com/
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

// Load feature classes
require_once plugin_dir_path( __FILE__ ) . 'features/seo-analyzer.php';
require_once plugin_dir_path( __FILE__ ) . 'features/post-type-manager.php';
require_once plugin_dir_path( __FILE__ ) . 'features/security-checker.php';

/**
 * Main Angie Demo Plugin Class
 */
class Angie_Demo_Plugin {

	/**
	 * Plugin version
	 */
	const VERSION = '1.0.0';

	/**
	 * REST API namespace
	 */
	const REST_NAMESPACE = 'angie-demo/v1';

	/**
	 * Option name for storing post type configurations
	 */
	const POST_TYPES_OPTION = 'angie_demo_post_types';

	/**
	 * Feature instances
	 */
	private $seo_analyzer;
	private $post_type_manager;
	private $security_checker;

	/**
	 * Initialize the plugin
	 */
	public function __construct() {
		$this->load_features();
		add_action( 'rest_api_init', [ $this, 'register_rest_routes' ] );
		add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_scripts' ] );
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_scripts' ] );
	}

	/**
	 * Load and initialize feature classes
	 */
	private function load_features() {
		$this->seo_analyzer = new Angie_Demo_SEO_Analyzer();
		$this->post_type_manager = new Angie_Demo_Post_Type_Manager();
		$this->security_checker = new Angie_Demo_Security_Checker();
	}

	/**
	 * Enqueue JavaScript MCP server with SDK dependency
	 */
	public function enqueue_scripts() {
		wp_enqueue_script_module(
			'angie-demo-mcp',
			plugin_dir_url( __FILE__ ) . 'out/angie-demo.mjs',
			[],
			self::VERSION,
			true
		);
	}

	/**
	 * Register REST API routes for MCP server
	 */
	public function register_rest_routes() {
		// Delegate route registration to feature classes
		$this->seo_analyzer->register_rest_routes();
		$this->post_type_manager->register_rest_routes();
		$this->security_checker->register_rest_routes();
	}
}

new Angie_Demo_Plugin();
