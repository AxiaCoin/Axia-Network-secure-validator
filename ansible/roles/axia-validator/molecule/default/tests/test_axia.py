def test_axia_user(host):
    user = host.user('axia')
    assert user.exists

    group = host.group('axia')
    assert group.exists

    assert user.gid == group.gid


def test_axia_binary(host):
    binary = host.file('/usr/local/bin/axia')
    assert binary.exists
    assert binary.user == 'axia'
    assert binary.group == 'axia'
    assert binary.mode == 0o755


def test_axia_service_file(host):
    if host.ansible.get_variables()['inventory_hostname'] == 'validator':
        svc = host.file('/etc/systemd/system/axia.service')
        assert svc.exists
        assert svc.user == 'root'
        assert svc.group == 'root'
        assert svc.mode == 0o600
        assert svc.contains('Restart=always')


def test_axia_running_and_enabled(host):
    if host.ansible.get_variables()['inventory_hostname'] == 'validator':
        axia = host.service("axia.service")
        assert axia.is_running
        # assert axia.is_enabled
