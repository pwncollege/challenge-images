# syntax=docker/dockerfile:1

FROM ubuntu:24.04 AS build-kernel

ARG LINUX_VERSION=6.10

RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential \
      bc \
      bison \
      flex \
      libncurses-dev \
      libssl-dev \
      libelf-dev \
  && rm -rf /var/lib/apt/lists/*

ADD https://github.com/torvalds/linux.git#v$LINUX_VERSION /usr/src/linux-$LINUX_VERSION
RUN ln -s /usr/src/linux-$LINUX_VERSION /usr/src/linux
WORKDIR /usr/src/linux-$LINUX_VERSION

RUN make defconfig

COPY <<'EOF' allconfig
CONFIG_9P_FS=y
CONFIG_9P_FS_POSIX_ACL=y
CONFIG_9P_FS_SECURITY=y
CONFIG_BALLOON_COMPACTION=y
CONFIG_CRYPTO_DEV_VIRTIO=y
CONFIG_DEBUG_FS=y
CONFIG_DEBUG_INFO=y
CONFIG_DEBUG_INFO_BTF=y
CONFIG_DEBUG_INFO_DWARF4=y
CONFIG_DEBUG_INFO_REDUCED=n
CONFIG_DEBUG_INFO_SPLIT=n
CONFIG_DEVPTS_FS=y
CONFIG_DRM_VIRTIO_GPU=y
CONFIG_FRAME_POINTER=y
CONFIG_GDB_SCRIPTS=y
CONFIG_HW_RANDOM_VIRTIO=y
CONFIG_HYPERVISOR_GUEST=y
CONFIG_IKCONFIG=y
CONFIG_IKCONFIG_PROC=y
CONFIG_NET_9P=y
CONFIG_NET_9P_DEBUG=n
CONFIG_NET_9P_VIRTIO=y
CONFIG_PARAVIRT=y
CONFIG_PCI=y
CONFIG_PCI_HOST_GENERIC=y
CONFIG_USER_NS=y
CONFIG_VIRTIO_BALLOON=y
CONFIG_VIRTIO_BLK=y
CONFIG_VIRTIO_BLK_SCSI=y
CONFIG_VIRTIO_CONSOLE=y
CONFIG_VIRTIO_INPUT=y
CONFIG_VIRTIO_NET=y
CONFIG_VIRTIO_PCI=y
CONFIG_VIRTIO_PCI_LEGACY=y
EOF

RUN make KCONFIG_ALLCONFIG=allconfig olddefconfig && \
    make -j"$(nproc)"


# Intentionally keep all of the intermediate build artifacts in this image
# so that the kernel can be incrementally recompiled
FROM build-kernel AS dev-kernel

WORKDIR /

RUN apt-get update && apt-get install -y --no-install-recommends \
      iproute2 \
      kmod \
      openssh-server \
      qemu-system \
      tini \
  && rm -rf /var/lib/apt/lists/*

RUN passwd -d root

COPY <<'EOF' /etc/ssh/sshd_config.d/vm.conf
PasswordAuthentication yes
PermitEmptyPasswords yes
PermitRootLogin yes
EOF

COPY <<'EOF' /etc/ssh/ssh_config.d/vm.conf
Host vm
    HostName localhost
    Port 22
    User root
    ControlMaster auto
    ControlPath /tmp/ssh_mux_%h_%p_%r
    ControlPersist 10m
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
    LogLevel ERROR
EOF

COPY --chmod=755 <<'EOF' /usr/local/bin/vm
#!/bin/sh
subcommand="$1"
shift
if [ ! -x "/usr/local/bin/vm-$subcommand" ]; then
    echo "Unknown subcommand: $subcommand" >&2
    exit 1
fi
exec "/usr/local/bin/vm-$subcommand" "$@"
EOF

COPY --chmod=755 <<'EOF' /usr/local/bin/vm-start
#!/bin/sh
start-stop-daemon \
    --start \
    --quiet \
    --background \
    --make-pidfile \
    --pidfile /var/run/vm.pid \
    --startas /bin/sh -- -c 'exec /usr/local/bin/vm-boot >/var/log/vm.log 2>&1'
EOF

COPY --chmod=755 <<'EOF' /usr/local/bin/vm-boot
#!/bin/sh

if [ -e /dev/kvm ]; then
    KVM_OPT="-enable-kvm"
else
    KVM_OPT=""
fi

DISK_PATH="/tmp/disk.img"
if [ ! -f "$DISK_PATH" ]; then
    truncate -s 1G "$DISK_PATH"
fi

exec /usr/bin/qemu-system-x86_64 \
    -kernel /usr/src/linux/arch/x86/boot/bzImage \
    -fsdev local,id=rootfs,path=/,security_model=passthrough,multidevs=remap \
    -device virtio-9p-pci,fsdev=rootfs,mount_tag=/dev/root \
    -device e1000,netdev=net0 \
    -netdev user,id=net0,hostfwd=tcp::22-:22 \
    -drive file="$DISK_PATH",format=raw,if=none,id=virtiodisk \
    -device virtio-blk-pci,drive=virtiodisk \
    -m 2G \
    -smp 2 \
    -nographic \
    -monitor none \
    -append "rw rootfstype=9p rootflags=trans=virtio,msize=512000 console=ttyS0 init=/usr/local/bin/vm-init" \
    $KVM_OPT
EOF

COPY --chmod=755 <<'EOF' /usr/local/bin/vm-init
#!/bin/sh

set -e

mount -t proc proc /proc
mount -t sysfs sys /sys
mount -t tmpfs tmp /tmp
mount -t tmpfs -o rw,nosuid,nodev,noexec,relatime,size=2G,x-mount.mkdir tmpfs /dev/shm
mount -t devpts -o x-mount.mkdir devpts /dev/pts

ln -s /proc/self/fd /dev/fd
ln -s /proc/self/fd/0 /dev/stdin
ln -s /proc/self/fd/1 /dev/stdout
ln -s /proc/self/fd/2 /dev/stderr

sysctl -w fs.protected_fifos=1
sysctl -w fs.protected_hardlinks=1
sysctl -w fs.protected_regular=2
sysctl -w fs.protected_symlinks=1

hostname vm

ip link set dev lo up
ip addr add 10.0.2.15/24 dev eth0
ip route add 10.0.2.0/24 via 10.0.2.2 dev eth0 2>/dev/null || true  # Error: Nexthop has invalid gateway.
ip link set dev eth0 up

service ssh start

exec /usr/bin/tini /bin/sleep -- infinity
EOF

COPY --chmod=755 <<'EOF' /usr/local/bin/vm-stop
#!/bin/sh
start-stop-daemon \
    --stop \
    --quiet \
    --pidfile /var/run/vm.pid
EOF

COPY --chmod=755 <<'EOF' /usr/local/bin/vm-enter
#!/bin/sh
exec /usr/bin/ssh vm
EOF

COPY --chmod=755 <<'EOF' /usr/local/bin/vm-exec
#!/bin/sh
exec /usr/bin/ssh vm "$@"
EOF

COPY --chmod=755 <<'EOF' /usr/local/bin/vm-logs
#!/bin/sh
touch /var/log/vm.log
tail -f /var/log/vm.log
EOF
