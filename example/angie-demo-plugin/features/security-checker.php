<?php
/**
 * Security Checker Feature
 * 
 * Handles security analysis functionality for the Angie Demo plugin
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Angie_Demo_Security_Checker {

	/**
	 * Constructor
	 */
	public function __construct() {
		// Feature initialization if needed
	}

	/**
	 * Register REST API routes for security checking
	 */
	public function register_rest_routes() {
		register_rest_route( Angie_Demo_Plugin::REST_NAMESPACE, '/security-check', [
			'methods' => 'POST',
			'callback' => [ $this, 'security_check' ],
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
	 * Check WordPress security
	 *
	 * @param WP_REST_Request $request The REST request object.
	 * @return array|WP_Error
	 */
	public function security_check( $request ) {
		$security_report = [
			'wordpress_version' => get_bloginfo( 'version' ),
			'php_version' => PHP_VERSION,
			'checks' => [],
			'recommendations' => [],
		];

		// Check WordPress version
		$wp_version = get_bloginfo( 'version' );
		$security_report['checks']['wordpress_version'] = [
			'status' => 'info',
			'message' => 'WordPress version: ' . $wp_version,
		];

		// Check if WordPress is up to date
		$update_data = get_site_transient( 'update_core' );
		if ( $update_data && isset( $update_data->updates ) ) {
			$updates_available = false;
			foreach ( $update_data->updates as $update ) {
				if ( $update->response === 'upgrade' ) {
					$updates_available = true;
					break;
				}
			}
			$security_report['checks']['wordpress_updates'] = [
				'status' => $updates_available ? 'warning' : 'success',
				'message' => $updates_available ? 'WordPress updates are available' : 'WordPress is up to date',
			];
		}

		// Check PHP version
		$php_version = PHP_VERSION;
		$min_php_version = '7.4';
		$security_report['checks']['php_version'] = [
			'status' => version_compare( $php_version, $min_php_version, '>=' ) ? 'success' : 'warning',
			'message' => 'PHP version: ' . $php_version . ' (minimum recommended: ' . $min_php_version . ')',
		];

		// Check if debug mode is enabled
		$debug_enabled = defined( 'WP_DEBUG' ) && WP_DEBUG;
		$security_report['checks']['debug_mode'] = [
			'status' => $debug_enabled ? 'warning' : 'success',
			'message' => $debug_enabled ? 'Debug mode is enabled (disable in production)' : 'Debug mode is disabled',
		];

		// Check if file editing is disabled
		$file_editing_disabled = defined( 'DISALLOW_FILE_EDIT' ) && DISALLOW_FILE_EDIT;
		$security_report['checks']['file_editing'] = [
			'status' => $file_editing_disabled ? 'success' : 'warning',
			'message' => $file_editing_disabled ? 'File editing is disabled' : 'File editing is enabled (disable for security)',
		];

		// Check if XML-RPC is disabled
		$xmlrpc_disabled = defined( 'XMLRPC_ENABLED' ) && ! XMLRPC_ENABLED;
		$security_report['checks']['xmlrpc'] = [
			'status' => $xmlrpc_disabled ? 'success' : 'info',
			'message' => $xmlrpc_disabled ? 'XML-RPC is disabled' : 'XML-RPC is enabled',
		];

		// Check for active plugins
		$active_plugins = get_option( 'active_plugins' );
		$security_report['checks']['active_plugins'] = [
			'status' => 'info',
			'message' => count( $active_plugins ) . ' active plugins',
			'count' => count( $active_plugins ),
		];

		// Check for themes
		$themes = wp_get_themes();
		$security_report['checks']['themes'] = [
			'status' => 'info',
			'message' => count( $themes ) . ' installed themes',
			'count' => count( $themes ),
		];

		// Generate recommendations
		$security_report['recommendations'] = $this->generate_security_recommendations( $security_report['checks'] );

		return $security_report;
	}

	/**
	 * Generate security recommendations
	 *
	 * @param array $checks The security checks results.
	 * @return array
	 */
	private function generate_security_recommendations( $checks ) {
		$recommendations = [];

		if ( isset( $checks['wordpress_updates'] ) && $checks['wordpress_updates']['status'] === 'warning' ) {
			$recommendations[] = [
				'type' => 'warning',
				'category' => 'security',
				'message' => 'Update WordPress to the latest version for security patches.',
			];
		}

		if ( isset( $checks['php_version'] ) && $checks['php_version']['status'] === 'warning' ) {
			$recommendations[] = [
				'type' => 'warning',
				'category' => 'security',
				'message' => 'Update PHP to a supported version for better security and performance.',
			];
		}

		if ( isset( $checks['debug_mode'] ) && $checks['debug_mode']['status'] === 'warning' ) {
			$recommendations[] = [
				'type' => 'warning',
				'category' => 'security',
				'message' => 'Disable debug mode in production for security.',
			];
		}

		if ( isset( $checks['file_editing'] ) && $checks['file_editing']['status'] === 'warning' ) {
			$recommendations[] = [
				'type' => 'warning',
				'category' => 'security',
				'message' => 'Disable file editing in wp-config.php for security.',
			];
		}

		$recommendations[] = [
			'type' => 'info',
			'category' => 'security',
			'message' => 'Regularly update plugins and themes to patch security vulnerabilities.',
		];

		return $recommendations;
	}
} 