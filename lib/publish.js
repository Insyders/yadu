class Publish {
  constructor(config) {
    this.config = config || {};
  }

  static CreatePublisher(args) {
    const publish = new Publish({
      debug: args.debug || process.env.DEBUG === 'true' || process.env.DEBUG === 1,
      region: args.region || process.env.AWS_REGION || process.env.REGION || 'us-east-1',
      layerVersion: args['layer-version'] || process.env.LAYER_VERSION,
      accountId: null,
    });

    return publish;
  }

  Publish() {
    console.log(this.config);
    return null;
  }
}

module.exports = Publish;
