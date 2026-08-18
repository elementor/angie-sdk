export default class Ajv {
	compile() {
		const validate = () => true;
		validate.errors = null;
		return validate;
	}

	getSchema() {
		return undefined;
	}

	errorsText() {
		return '';
	}
}
