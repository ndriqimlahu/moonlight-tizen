#ifndef __DISPATCHER_LIB_HPP
#define __DISPATCHER_LIB_HPP

#include <condition_variable>
#include <functional>
#include <mutex>
#include <queue>
#include <thread>

static void no_op() {}

class Entry {
 public:
  Entry() : end(false), notify(true) {}
  ~Entry() = default;

  std::function<void(void)> func;
  bool end;
  std::condition_variable_any* cv;
  std::recursive_mutex* mutex;
  bool notify;
};

class DispatcherQueue {
 public:
  DispatcherQueue() = default;
  ~DispatcherQueue() = default;

  DispatcherQueue(const DispatcherQueue&) = delete;
  DispatcherQueue operator=(const DispatcherQueue&) = delete;

  void push(Entry&& entry) {
    std::lock_guard<std::recursive_mutex> lock(mutex_);
    queue_.emplace(std::move(entry));
    cv_.notify_one();
  }

  Entry pop() {
    std::lock_guard<std::recursive_mutex> lock(mutex_);
    Entry result = queue_.front();
    queue_.pop();
    return result;
  }

  bool wait() {
    std::unique_lock<std::recursive_mutex> lock(mutex_);
    if (!queue_.empty()) {
      return true;
    }

    cv_.wait(lock);
    return false;
  }

 private:
  std::queue<Entry> queue_;
  std::recursive_mutex mutex_;
  std::condition_variable_any cv_;
};

class Dispatcher {
 public:
  Dispatcher(const std::string& name) : name_(name) {}
  ~Dispatcher() { stop(); }

  Dispatcher(const Dispatcher&) = delete;
  Dispatcher operator=(const Dispatcher&) = delete;

  void start() {
    thread_ = std::thread([this] { this->dispatcher_func(); });
  }

  void stop() {
    post_job(no_op, true);
    thread_.join();
  }

  template <typename R, typename... Ts>
  R dispatch_method(std::recursive_mutex& thread_mutex,
                    std::condition_variable_any& thread_cv, R (*method)(Ts...),
                    bool end, Ts... ts) {
    if constexpr (std::is_same<R, void>::value) {
      Entry entry;
      int* err = &errno;
      entry.func = [&]() {
        method(ts...);
        *err = errno;
      };
      entry.mutex = &thread_mutex;
      entry.cv = &thread_cv;
      entry.end = end;

      {
        std::unique_lock<std::recursive_mutex> lock(thread_mutex);
        queue_.push(std::move(entry));
        thread_cv.wait(lock);
      }

      return;
    } else {
      R ret;

      Entry entry;
      int* err = &errno;
      entry.func = [&]() {
        ret = method(ts...);
        *err = errno;
      };
      entry.mutex = &thread_mutex;
      entry.cv = &thread_cv;
      entry.end = end;

      {
        std::unique_lock<std::recursive_mutex> lock(thread_mutex);
        queue_.push(std::move(entry));
        thread_cv.wait(lock);
      }

      return ret;
    }
  }

  template<class Callable, typename... Ts>
  void post_job(Callable&& fn, bool end, Ts... ts) {
    Entry entry;
    int* err = &errno;
    entry.func = [=]() {
      fn(ts...);
      *err = errno;
    };
    entry.end = end;
    entry.notify = false;

    queue_.push(std::move(entry));

    return;
  }

 private:
  void dispatcher_func() {
    bool running = true;
    while (running) {
      while (!queue_.wait()) {
      }
      Entry entry = queue_.pop();

      if (entry.end) {
        running = false;
      } else {
        entry.func();
      }

      if (entry.notify) {
        std::unique_lock<std::recursive_mutex> lock(*entry.mutex);
        entry.cv->notify_one();
      }
    }
  }

  DispatcherQueue queue_;
  std::thread thread_;
  std::string name_;
};

class ThreadStorage {
 public:
  ThreadStorage() = default;
  ~ThreadStorage() = default;
  std::recursive_mutex mutex;
  std::condition_variable_any cv;
};

#endif
