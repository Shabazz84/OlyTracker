"""config.py must be usable from any cwd, in particular from this repo's own
root (the documented migration runbook: `python main.py synthesize` run from
D:\\Programming\\OlyTracker). BRAINDUMP_CONFIG used to default to a bare
relative "config.yaml", which indexer.config_loader.load_config() resolves
against cwd — OlyTracker has none, so this silently pointed nowhere."""

import os

import config


def test_braindump_config_points_at_an_existing_file():
    assert os.path.isabs(config.BRAINDUMP_CONFIG) or os.path.exists(config.BRAINDUMP_CONFIG), (
        f"config.BRAINDUMP_CONFIG={config.BRAINDUMP_CONFIG!r} does not resolve "
        f"to an existing file regardless of cwd"
    )
    assert os.path.exists(config.BRAINDUMP_CONFIG), (
        f"config.BRAINDUMP_CONFIG={config.BRAINDUMP_CONFIG!r} does not exist — "
        f"main.py synthesize/index would fail with FileNotFoundError"
    )


def test_braindump_config_defaults_inside_braindump_path():
    # Guards the actual bug: a bare relative default resolves against cwd, not
    # BRAINDUMP_PATH. Skip if the operator has overridden BRAINDUMP_CONFIG via
    # env var to something outside BRAINDUMP_PATH on purpose.
    if os.getenv("BRAINDUMP_CONFIG"):
        return
    assert os.path.isabs(config.BRAINDUMP_CONFIG), (
        "default BRAINDUMP_CONFIG must be an absolute path anchored in "
        "BRAINDUMP_PATH, not a bare relative filename"
    )
    assert config.BRAINDUMP_CONFIG.startswith(config.BRAINDUMP_PATH)
