const path = require('path');

const cmd = require('../cmd');
const { Project } = require('../project');
const tpl = require('../tpl');
const { nginxUsername, nginxPassword } = require('../env');

const inventoryFileName = 'inventory'


class Ansible {
  constructor(cfg) {
    this.config = JSON.parse(JSON.stringify(cfg));

    this.ansiblePath = path.join(__dirname, '..', '..', '..', 'ansible');
    this.options = {
      cwd: this.ansiblePath,
      verbose: true
    };
  }

  async runCommonPlaybook(playbookName) {
    const inventoryPath = this._writeInventory();
    return this._cmd(`${playbookName} -f 30 -i "${inventoryPath}"`);
  }

  async clean() {

  }

  async _cmd(command, options = {}) {
    const actualOptions = Object.assign({}, this.options, options);
    return cmd.exec(`ansible-playbook ${command}`, actualOptions);
  }

  _writeInventory() {
    const origin = path.resolve(__dirname, '..', '..', '..', 'tpl', 'ansible_inventory');
    const project = new Project(this.config);
    const buildDir = path.join(project.path(), 'ansible');
    const target = path.join(buildDir, inventoryFileName);

    const validators = this._genTplNodes(this.config.validators);
    const validatorTelemetryUrl = this.config.validators.telemetryUrl;
    const validatorLoggingFilter = this.config.validators.loggingFilter;
    const axiaAdditionalValidatorFlags = this.config.validators.additionalFlags;

    let publicNodes = [];
    let publicTelemetryUrl = '';
    let publicLoggingFilter='';
    let axiaAdditionalPublicFlags = '';
    if (this.config.publicNodes) {
      publicNodes = this._genTplNodes(this.config.publicNodes, validators.length);
      publicTelemetryUrl = this.config.publicNodes.telemetryUrl;
      publicLoggingFilter = this.config.publicNodes.loggingFilter;
      axiaAdditionalPublicFlags = this.config.publicNodes.additionalFlags;
    }

    const data = {
      project: this.config.project,

      axiaBinaryUrl: this.config.axiaBinary.url,
      axiaBinaryChecksum: this.config.axiaBinary.checksum,
      chain: this.config.chain || 'axctest',
      axiaNetworkId: this.config.axiaNetworkId || 'axctcc2',

      validators,
      publicNodes,

      validatorTelemetryUrl,
      publicTelemetryUrl,

      validatorLoggingFilter,
      publicLoggingFilter,

      buildDir,

      axiaAdditionalCommonFlags: this.config.additionalFlags,
      axiaAdditionalValidatorFlags,
      axiaAdditionalPublicFlags,

      nginxUsername: nginxUsername,
      nginxPassword: nginxPassword
    };

    if (this.config.nodeExporter?.enabled) {
      data.nodeExporterEnabled = true;
      data.nodeExporterBinaryUrl = this.config.nodeExporter.binary.url;
      data.nodeExporterBinaryChecksum = this.config.nodeExporter.binary.checksum;
    } else {
      data.nodeExporterEnabled = false;
    }

    if (this.config.axiaRestart?.enabled) {
      data.axiaRestartEnabled = true;
      data.axiaRestartMinute = this.config.axiaRestart.minute || '*';
      data.axiaRestartHour = this.config.axiaRestart.hour || '*';
      data.axiaRestartDay = this.config.axiaRestart.day || '*';
      data.axiaRestartMonth = this.config.axiaRestart.month || '*';
      data.axiaRestartWeekDay = this.config.axiaRestart.weekDay || '*';
    } else {
      data.axiaRestartEnabled = false;
    }

    if(this.config.validators.dbSnapshot?.url != undefined && this.config.validators.dbSnapshot?.checksum != undefined){
      data.dbSnapshotUrl = this.config.validators.dbSnapshot.url;
      data.dbSnapshotChecksum = this.config.validators.dbSnapshot.checksum;
    }

    tpl.create(origin, target, data);

    return target;
  }

  _genTplNodes(nodeSet, offset=0) {
    const output = [];
    const vpnAddressBase = '10.0.0';
    let counter = offset;

    nodeSet.nodes.forEach((node) => {
      node.ipAddresses.forEach((ipAddress) => {
        counter++;
        const item = {
          ipAddress,
          sshUser: node.sshUser,
          vpnAddress: `${vpnAddressBase}.${counter}`,
        };
        if(node.nodeName){
          item.nodeName=node.nodeName
        }
        output.push(item);
      });
    });
    return output;
  }
}

module.exports = {
  Ansible
}
