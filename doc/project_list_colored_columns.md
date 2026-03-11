# Project List Colored Columns - Time Duration Logic

This document describes the logic for colored columns in the project list that show how long specific steps have taken.

## Color Coding Overview

The columns use three color levels to indicate time elapsed:
- **Green** (`alert-green`, `#d9ead3`): Within acceptable timeframe
- **Orange** (`alert-orange`, `#facc99`): Warning - taking longer than ideal
- **Red** (`alert-red`, `#ea9999`): Alert - significantly delayed

## Time Duration Fields

| Field Name | Start Date | End Date | Green (≤) | Orange | Red (>) | Special Logic |
|------------|------------|----------|-----------|---------|---------|---------------|
| **days_recep_ctrl** | `open_date` | `queued` | ≤7 days | 8-14 days | >14 days | From project opening to sample queued |
| **days_prep_start** | `queued` | `library_prep_start` | ≤7 days | 8-10 days | >10 days | Returns "-" if library is "by user" |
| **days_seq_start** | `qc_library_finished` OR `queued`* | `sequencing_start_date` | ≤7 days | 8-10 days | >10 days | *Uses `queued` if library is "by user", otherwise `qc_library_finished` |
| **days_seq** | `sequencing_start_date` | `all_samples_sequenced` | ≤7 days | 8-14 days | >14 days | Duration of sequencing phase |
| **days_analysis** | `all_samples_sequenced` | `best_practice_analysis_completed` | ≤7 days | 8-10 days | >10 days | Time from sequencing complete to analysis done |
| **days_data_delivery** | `all_samples_sequenced` | `all_raw_data_delivered` | ≤7 days | 8-10 days | >10 days | Time from sequencing to data delivery |
| **days_close** | `all_raw_data_delivered` | `close_date` | ≤7 days | 8-10 days | >10 days | Time from data delivery to project closure |
| **days_prep** | `library_prep_start` | `qc_library_finished` | ≤10 days | 11-19 days | >19 days | Returns "-" if library is "by user" |

## Implementation Details

### Backend Calculation Function

**Location:** `status/projects.py` lines 268-281

```python
def _calculate_days_in_status(self, start_date, end_date):
    days = 0
    if start_date:
        if end_date:
            # Both dates exist: calculate time between them
            delta = dateutil.parser.parse(end_date) - dateutil.parser.parse(start_date)
        else:
            # End date missing: calculate time from start to now (ongoing)
            delta = datetime.datetime.now() - dateutil.parser.parse(start_date)
        days = delta.days
    else:
        # No start date: return dash
        days = "-"
    return days
```

### Date Field Definitions

**Location:** `status/projects.py` lines 289-309

#### def_dates_gen
Fields from main project document:
```python
{
    "days_recep_ctrl": ["open_date", "queued"],
    "days_analysis": ["all_samples_sequenced", "best_practice_analysis_completed"],
    "days_data_delivery": ["all_samples_sequenced", "all_raw_data_delivered"],
    "days_close": ["all_raw_data_delivered", "close_date"],
}
```

#### def_dates_summary
Fields from project summary_dates:
```python
{
    "days_prep_start": ["queued", "library_prep_start"],
    "days_seq_start": [["qc_library_finished", "queued"], "sequencing_start_date"],
    "days_seq": ["sequencing_start_date", "all_samples_sequenced"],
    "days_prep": ["library_prep_start", "qc_library_finished"],
}
```

### Frontend Color Assignment

**Location:** `run_dir/static/js/projects.js` lines 241-270

```javascript
check_value = Math.abs(summary_row[column_tuple[1]]);
switch(column_tuple[1]){
  case 'days_recep_ctrl':
    to_ret = check_value>7 ? check_value>14 ? 'alert-red': 'alert-orange' :'alert-green';
    break;
  case 'days_prep_start':
    to_ret = check_value>7 ? check_value>10 ? 'alert-red': 'alert-orange' :'alert-green';
    break;
  case 'days_seq_start':
    to_ret = check_value>7 ? check_value>10 ? 'alert-red': 'alert-orange' :'alert-green';
    break;
  case 'days_seq':
    to_ret = check_value>7 ? check_value>14 ? 'alert-red': 'alert-orange' :'alert-green';
    break;
  case 'days_analysis':
    to_ret = check_value>7 ? check_value>10 ? 'alert-red': 'alert-orange' : 'alert-green';
    break;
  case 'days_data_delivery':
    to_ret = check_value>7 ? check_value>10 ? 'alert-red': 'alert-orange' : 'alert-green';
    break;
  case 'days_close':
    to_ret = check_value>7 ? check_value>10 ? 'alert-red': 'alert-orange' : 'alert-green';
    break;
  case 'days_prep':
    to_ret = check_value>10 ? check_value>19 ? 'alert-red': 'alert-orange' : 'alert-green';
    break;
}
```

### CSS Classes

**Location:** `run_dir/static/css/status_b5.css` lines 1068-1082

```css
td.alert-red{
  background-color: #ea9999 !important;
  background-image: inherit !important;
}

td.alert-orange{
  background-color: #facc99 !important;
  background-image: inherit !important;
}

td.alert-green{
  background-color: #d9ead3 !important;
  background-image: inherit !important;
}
```

## Key Behaviors

1. **Ongoing calculations**: If `end_date` is `None`, the calculation uses current time (shows days elapsed so far)
2. **Missing start**: Returns `"-"` if `start_date` doesn't exist
3. **Library "by user"**: Projects with `library_construction_method` containing "by user" skip prep-related calculations (`days_prep` and `days_prep_start`) and return `"-"`
4. **Conditional start date**: `days_seq_start` uses different start dates depending on whether library prep was done in-house (`qc_library_finished`) or by user (`queued`)
5. **Absolute values**: The frontend uses `Math.abs()` to handle negative values that might occur in edge cases

## Date Calculation in Other Views

Similar logic is used in other queue views (sequencing queues, workset queues) with a simplified function:

**Location:** `run_dir/static/js/sequencing_queues.js` lines 134-156, `run_dir/static/js/workset_queues.js` lines 161-190

```javascript
function getDaysAndDateLabel(date, option){
  var number_of_days = 0;
  var label = '';
  if (date == null){
      label = 'danger';
      number_of_days = ' Missing';
  } else {
      if( option=='date' || option=='both' ){
        //calculate number of days from given date to current date
        number_of_days = Math.floor(Math.abs(new Date() - new Date(date))/(1000*86400));
      }
      if (option=='label' || option=='both') {
        if (option=='label'){
          number_of_days = date;
        }
        if (number_of_days < 7){
          label =  'success';
        }
        else if (number_of_days >= 7 && number_of_days < 14) {
          label = 'warning';
        }
        else {
          label = 'danger';
        }
      }
  }
  return [number_of_days, label];
}
```

This function uses Bootstrap alert classes (`success`, `warning`, `danger`) with slightly different thresholds (7/14 days).
