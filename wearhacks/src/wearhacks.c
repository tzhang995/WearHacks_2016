#include <pebble.h>

static Window *window;
static TextLayer *text_layer;
#define KEY_LAT 0
#define KEY_LONG 1
#define KEY_DIFF 2
#define KEY_MIN 3
#define KEY_MAX 4
#define KEY_VIBE 5

static int latitude;
static int longitude;
static int diff;
static int slow;
static int fast;

/*const uint32_t const segments[] = { 100 };
    VibePattern pat = {
      .durations = segments,
      .num_segments = ARRAY_LENGTH(segments),
    };
    vibes_enqueue_custom_pattern(pat);*/


static void select_click_handler(ClickRecognizerRef recognizer, void *context) {
  text_layer_set_text(text_layer, "WHAT");
}

static void up_click_handler(ClickRecognizerRef recognizer, void *context) {
  text_layer_set_text(text_layer, "IS");
}

static void down_click_handler(ClickRecognizerRef recognizer, void *context) {
  text_layer_set_text(text_layer, "LOVE");
	//vibes_long_pulse();
  // Vibe pattern: ON for 200ms, OFF for 100ms, ON for 400ms:
  static const uint32_t const segments[] = { 200, 100, 4000 };
  VibePattern pat = {
    .durations = segments,
    .num_segments = ARRAY_LENGTH(segments),
  };
  vibes_enqueue_custom_pattern(pat);
 }

static void click_config_provider(void *context) {
  window_single_click_subscribe(BUTTON_ID_SELECT, select_click_handler);
  window_single_click_subscribe(BUTTON_ID_UP, up_click_handler);
  window_single_click_subscribe(BUTTON_ID_DOWN, down_click_handler);
}

static void window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);

  text_layer = text_layer_create(
      GRect(0, PBL_IF_ROUND_ELSE(58, 52), bounds.size.w, 50));
  text_layer_set_text(text_layer, "Press a button");
  text_layer_set_text_alignment(text_layer, GTextAlignmentCenter);
  text_layer_set_font(text_layer, fonts_get_system_font(FONT_KEY_BITHAM_42_BOLD));
  layer_add_child(window_layer, text_layer_get_layer(text_layer));
}

static void window_unload(Window *window) {
  text_layer_destroy(text_layer);
}

static void displayLocation(){
  char * str="                              ";
  //snprintf(str, 30, "%d , %d\n%d", latitude, longitude,diff);
  snprintf(str, 30, "%d", diff);
  APP_LOG(APP_LOG_LEVEL_DEBUG, "updating loc: %s", str);
  text_layer_set_text(text_layer, str);

  /*if (diff > 40){
    const uint32_t const segments[] = { 100 };
    VibePattern pat = {
      .durations = segments,
      .num_segments = ARRAY_LENGTH(segments),
    };
    vibes_enqueue_custom_pattern(pat);
  }*/
}


static void inbox_received_callback(DictionaryIterator *iterator, void *context) {
  // Store incoming information
  //static float latitude;
  //static float longitude;
  //static float difference;
  Tuple *lat_tuple = dict_find(iterator, KEY_LAT);
  Tuple *long_tuple = dict_find(iterator, KEY_LONG);
  Tuple *diff_tuple = dict_find(iterator, KEY_DIFF);
  Tuple *min_tuple = dict_find(iterator, KEY_MIN);
  Tuple *max_tuple = dict_find(iterator, KEY_MAX);
  Tuple *vibe_tuple = dict_find(iterator, KEY_VIBE);

  if(lat_tuple && long_tuple && diff_tuple && min_tuple && max_tuple) {
    latitude=lat_tuple->value->int32;
    longitude=long_tuple->value->int32;
    diff=max_tuple->value->int32;
    //slow = slow_tuple->value->int32;
    //fast = fast_tuple->value->int32;
    /*if (slow == 1){
      static const uint32_t const segments[] = { 1000,10,1000 };
      VibePattern pat = {
        .durations = segments,
        .num_segments = ARRAY_LENGTH(segments),
      };
      vibes_enqueue_custom_pattern(pat);
    } else {
      static const uint32_t const segments[] = { 50, 10, 50 };
      VibePattern pat = {
        .durations = segments,
        .num_segments = ARRAY_LENGTH(segments),
      };
      vibes_enqueue_custom_pattern(pat);
    }*/

    displayLocation();
  }
  if (vibe_tuple){
    static const uint32_t const segments[] = { 1000 };
      VibePattern pat = {
        .durations = segments,
        .num_segments = ARRAY_LENGTH(segments),
      };
      vibes_enqueue_custom_pattern(pat);
  }
}

static void inbox_dropped_callback(AppMessageResult reason, void *context) {
  APP_LOG(APP_LOG_LEVEL_ERROR, "Message dropped!");
}

static void outbox_failed_callback(DictionaryIterator *iterator, AppMessageResult reason, void *context) {
  APP_LOG(APP_LOG_LEVEL_ERROR, "Outbox send failed!");
}

static void outbox_sent_callback(DictionaryIterator *iterator, void *context) {
  APP_LOG(APP_LOG_LEVEL_INFO, "Outbox send success!");
}

static void init(void) {
  window = window_create();
  window_set_click_config_provider(window, click_config_provider);
  window_set_window_handlers(window, (WindowHandlers) {
    .load = window_load,
    .unload = window_unload,
  });
  const bool animated = true;
  window_stack_push(window, animated);
    // Register callbacks
  app_message_register_inbox_received(inbox_received_callback);
  app_message_register_inbox_dropped(inbox_dropped_callback);
  app_message_register_outbox_failed(outbox_failed_callback);
  app_message_register_outbox_sent(outbox_sent_callback);
  
  // Open AppMessage
  const int inbox_size = 128;
  const int outbox_size = 128;
  app_message_open(inbox_size, outbox_size);
}

static void deinit(void) {
  window_destroy(window);
}

int main(void) {
  init();

  APP_LOG(APP_LOG_LEVEL_DEBUG, "Done initializing, pushed window: %p", window);

  app_event_loop();
  deinit();
}
