/**
 * GymTrack AI - Biometric Device Mutex
 * 
 * Ensures single-threaded, sequential TCP socket access to the physical
 * eSSL / ZKTeco K20 hardware terminal (which only accepts 1 concurrent connection on port 4370).
 */

class DeviceMutex {
  private locked = false;
  private queue: Array<() => void> = [];

  async acquire(timeoutMs = 12000): Promise<() => void> {
    if (!this.locked) {
      this.locked = true;
      let released = false;
      return () => {
        if (!released) {
          released = true;
          this.release();
        }
      };
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.queue.indexOf(run);
        if (idx !== -1) this.queue.splice(idx, 1);
        reject(new Error("Timeout waiting for K20 device socket lock. Device may be busy with another sync."));
      }, timeoutMs);

      const run = () => {
        clearTimeout(timer);
        this.locked = true;
        let released = false;
        resolve(() => {
          if (!released) {
            released = true;
            this.release();
          }
        });
      };

      this.queue.push(run);
    });
  }

  private release() {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    } else {
      this.locked = false;
    }
  }

  isLocked(): boolean {
    return this.locked;
  }
}

export const deviceMutex = new DeviceMutex();
