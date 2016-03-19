#include <pebble.h>

static Window *window;
static TextLayer *text_layer;
#define KEY_LAT 0
#define KEY_LONG 1
#define KEY_DIFF 2

static int latitude;
static int longitude;


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

  text_layer = text_layer_create(GRect(0, 72, bounds.size.w, 20));
  text_layer_set_text(text_layer, "Press a button");
  text_layer_set_text_alignment(text_layer, GTextAlignmentCenter);
  layer_add_child(window_layer, text_layer_get_layer(text_layer));
}

static void window_unload(Window *window) {
  text_layer_destroy(text_layer);
}

static void displayLocation(){
  char * str="                              ";
  snprintf(str, 30, "%d , %d", latitude, longitude);
  APP_LOG(APP_LOG_LEVEL_DEBUG, "updating loc: %s", str);
  text_layer_set_text(text_layer, str);
}

static void inbox_received_callback(DictionaryIterator *iterator, void *context) {
  // Store incoming information
  //static float latitude;
  //static float longitude;
  //static float difference;
  Tuple *lat_tuple = dict_find(iterator, KEY_LAT);
  Tuple *long_tuple = dict_find(iterator, KEY_LONG);
  //Tuple *diff_tuple = dict_find(iterator, KEY_DIFF);

  if(lat_tuple && long_tuple) {// && diff_tuple) {
    //snprintf(lat_tuple, sizeof(lat_tuple), "%dC", (int)temp_tuple->value->int32);
    //snprintf(conditions_buffer, sizeof(conditions_buffer), "%s", conditions_tuple->value->cstring);
    latitude=lat_tuple->value->int32;
    longitude=long_tuple->value->int32;
    displayLocation();
    // Assemble full string and display
    //snprintf(weather_layer_buffer, sizeof(weather_layer_buffer), "%s, %s", temperature_buffer, conditions_buffer);
    //text_layer_set_text(s_weather_layer, weather_layer_buffer);
  }

  //APP_LOG(APP_LOG_LEVEL_INFO,difference);
  /*static char temperature_buffer[8];
  static char conditions_buffer[32];
  static char weather_layer_buffer[32];
  
  // Read tuples for data
  Tuple *temp_tuple = dict_find(iterator, KEY_TEMPERATURE);
  Tuple *conditions_tuple = dict_find(iterator, KEY_CONDITIONS);
  
  // If all data is available, use it
  if(temp_tuple && conditions_tuple) {
    snprintf(temperature_buffer, sizeof(temperature_buffer), "%dC", (int)temp_tuple->value->int32);
    snprintf(conditions_buffer, sizeof(conditions_buffer), "%s", conditions_tuple->value->cstring);
    
    // Assemble full string and display
    snprintf(weather_layer_buffer, sizeof(weather_layer_buffer), "%s, %s", temperature_buffer, conditions_buffer);
    text_layer_set_text(s_weather_layer, weather_layer_buffer);
  }*/

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
