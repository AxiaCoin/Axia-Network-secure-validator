# Ansible Guide

This repo contains collections of Ansible scripts inside the [ansible/](ansible)
directory, so called "Roles", which are responsible for the provisioning of
all configured nodes. It automatically sets up the [Application
Layer](README.md/#application-layer) and manages updates for AXIA
software releases.

There is a main Ansible Playbook that orchestrates all the roles, it gets
executed locally on your machine, then connects to the configured nodes and sets
up the required tooling. Firewalls, AXIA nodes and all its dependencies are
installed by issuing a single command. No manual intervention into the remote
nodes is required.

## Prerequisites

* [Ansible](https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html)
  (v2.8+)

  On Debian-based systems this can be installed with `sudo apt install ansible`
  from the standard repositories.

* Running Debian-based nodes

  The nodes require configured SSH access, but don't need any other preparatory
  work. It's up to you on how many nodes you want to use. This setup assumes the
  remote users have `sudo` privileges with the same `sudo` password.
  Alternatively, [additional
  configuration](https://docs.ansible.com/ansible/latest/user_guide/become.html)
  is required.

It's recommended to setup SSH pubkey authentication for the nodes and to add the
access keys to the SSH agent.

## Inventory

All required data is saved in a [Ansible
inventory](https://docs.ansible.com/ansible/latest/user_guide/intro_inventory.html),
which by default is placed under `/etc/ansible/hosts` (but you can create it
anywhere you want) and must only be configured once. Most values from the
[SAMPLE FILE](ansible/inventory.sample) can be copied. Only a handful of entries
must be adjusted.

For each node, the following information must be configured in the Ansible
inventory:

* IP address or URL.
* SSH user (as `ansible_user`). It's encouraged NOT to use `root`.
* (optional) The telemetry URL (e.g. `wss://telemetry.axia.io/submit/`,
  where the info can then be seen under https://telemetry.axia.io).
* (optional) The logging filter.

The other default values from the sample inventory can be left as is.

**NOTE**: Telemetry information exposes IP address, among other information. For
this reason it's highly encouraged to use a [private telemetry
server](https://github.com/axctech/axlib-telemetry) and not to expose the
validator to a public server.

### Setup Validator

Setup the validator node by specifying a `[validator_<NUM>]` host, including its
required variables. `<NUM>` should start at `0` and increment for each other
validator (assuming you have more than one validator).

Example:

```ini
[validator_0]
147.75.76.65

[validator_0:vars]
ansible_user=alice
telemetry_url=wss://telemetry.axia.io/submit/
logging_filter='sync=trace,afg=trace,babe=debug'

[validator_1]
162.12.35.55

[validator_1:vars]
ansible_user=bob
telemetry_url=wss://telemetry.axia.io/submit/
logging_filter='sync=trace,afg=trace,babe=debug'
```

### Grouping Validators

All nodes to be setup must be grouped under `[validator:children]`.

Example:

```ini
[validator:children]
validator_0
validator_1
```

### Specify common variables

Finally, define the common variables for all the nodes.

Important variables which should vary from the [sample inventory](ansible/inventory.sample):

* `project` - The name for how each node should be prefixed for the telemetry
  name.
* `axia_binary_url` - This is the URL from were Ansible will
  download the AXIA binary. Binary releases are available in the official
  [AXIA Releases repo](https://github.com/axia-tech/axia/releases).
* `axia_binary_checksum` - The SHA256 checksum of the AXIA binary which
  Ansible verifies during execution. Must be prefixed with `sha256:`.
* `chain` - The chain to work on, such as `axctest` or `axia`.
* `axia_network_id` - The network identifier, such as `axctcc3` (for AxiaTest)
  or `axia`.
* `node_exporter_enabled` - Enable or disable the setup of [Node
  Exporter](https://github.com/prometheus/node_exporter). It's up to you whether
  you want it or not.

The other default values from the sample inventory can be left as is.

Example:

```ini
[all:vars]
# The name for how each node should be prefixed for the telemetry name
project=alice-in-wonderland

# Can be left as is.
ansible_ssh_common_args='-o StrictHostKeyChecking=no -o ConnectTimeout=15'
build_dir=$HOME/.config/secure-validator/build/axia/ansible

# Specify which `axia` binary to install. Checksum is verified during execution.
axia_binary_url='https://github.com/axia-tech/axia/releases/download/v0.1.0/axia'
axia_binary_checksum='sha256:349b786476de9188b79817cab48fc6fc030908ac0e8e2a46a1600625b1990758'

# Specify the chain/network.
axia_network_id=axia
chain=axia

# Nginx authentication settings.
nginx_user='prometheus'
nginx_password='nginx_password'

# Node exporter settings. Disabled by default.
node_exporter_enabled='false'
node_exporter_binary_url='https://github.com/prometheus/node_exporter/releases/download/v0.18.1/node_exporter-0.18.1.linux-amd64.tar.gz'
node_exporter_binary_checksum='sha256:b2503fd932f85f4e5baf161268854bf5d22001869b84f00fd2d1f57b51b72424'

# AXIA service restart settings. Enabled to restart every hour.
axia_restart_enabled='true'
axia_restart_minute='0'
axia_restart_hour='*'
axia_restart_day='*'
axia_restart_month='*'
axia_restart_weekday='*'

# Optional: Restore the chain db from a .7z snapshot
axia_db_snapshot_url='https://axct-rocksdb.axcshots.io/axctest-6658753.RocksDb.7z'
axia_db_snapshot_checksum='sha256:4f61a99e4b00acb335aff52f2383880d53b30617c0ae67ac47c611e7bf6971ff'
```

## Execution

Download the required files.

```console
user@pc:~$ git clone https://github.com/axia-tech/axia-secure-validator.git
user@pc:~$ cd axia-secure-validator/ansible
```

Once the inventory file is configured, simply run the setup script and specify
the `sudo` password for the remote machines.

**NOTE**: If no inventory path is specified, it will try to look for
`ansible/inventory.yml` by default.

```console
user@pc:~/axia-secure-validator/ansible$ chmod +x setup.sh
user@pc:~/axia-secure-validator/ansible$ ./setup.sh my_inventory.yml
Sudo password for remote servers:
>> Pulling upstream changes... [OK]
>> Testing Ansible availability... [OK]
>> Finding validator hosts... [OK]
  hosts (2):
    147.75.76.65
    162.12.35.55
>> Testing connectivity to hosts... [OK]
>> Executing Ansible Playbook...

...
```

Alternatively, execute the Playbook manually ("become" implies `sudo`
privileges).

```console
user@pc:~/axia-secure-validator/ansible$ ansible-playbook -i my_inventory.yml main.yml --become --ask-become
```

The `setup.sh` script handles some extra functionality, such as downloading the
newest upstream changes and checking connectivity of remote hosts including
privilege escalation. This script/Playbook can be executed over and over again.

Additional Playbooks are provided besides `main.yml`, but those are outside the
scope of this guide.

### Updating AXIA

To update the AXIA version, simply adjust those two lines in the Ansible
inventory:

```ini
axia_binary_url='...'
axia_binary_checksum='sha256:...'
```

Then just execute `setup.sh` again.
