$(function(){
    return $.getJSON('/api/v1/assign_roles/users', function (data) {
      window.users=Object.keys(data)
        .map(n=>{
            return {val:n.split('@')[0]};
        });
    });
});

function generate_category_label(category){
     var cat_classes = {
        'Workset': ['primary', 'calendar-plus'],
        'Flowcell': ['success', 'grip-vertical'],
        'Decision': ['info', 'thumbs-up'],
        'Lab': ['success', 'flask'],
        'Bioinformatics': ['warning', 'laptop-code'],
        'User Communication': ['usr', 'people-arrows'],
        'Administration': ['danger', 'folder-open'],
        'Important': ['imp', 'exclamation-circle'],
        'Deviation': ['devi', 'frown']
    }
    // Remove the whitespace
    var category = category.trim()
    // Check if we recognise this category in the class object keys
    if (Object.keys(cat_classes).indexOf(category) != -1){
        cat_label = '<span class="badge bg-'+ cat_classes[category][0] +'">'+ category + '&nbsp;' + '<span class="fa fa-'+ cat_classes[category][1] +'">'+"</span></span>";
    }else{
    // Default button formatting
        cat_label = '<span class="badge bg-secondary">'+ category +"</span>";
    }
    return cat_label;
}

function get_note_url() {
    // URL for the notes
    if ((typeof notetype !== 'undefined' && notetype == 'lims_step') || ('lims_step' in window && lims_step !== null)){
        note_url='/api/v1/workset_notes/' + lims_step;
    } else if ((typeof notetype !== 'undefined' && notetype == 'flowcell') || ('flowcell' in window && flowcell!== null)){
        note_url='/api/v1/flowcell_notes/' + flowcell;
    } else {
        note_url='/api/v1/running_notes/' + project;
    }
    return note_url;
}

function make_running_note(date, note){
  try {
    var category = '';
    var date = date.replace(/-/g, '/');
    date = date.replace(/\.\d{6}/, '');
    date = new Date(date);
    if (note['note'] != undefined){
        if(date > new Date('2015-01-01')){
          noteText = make_markdown(note['note']);
        } else {
          noteText = '<pre class="plaintext_running_note">'+make_project_links(note['note'])+'</pre>';
        }
        datestring = date.toDateString() + ', ' + date.toLocaleTimeString(date);
        var page_to_link = '';
        if(typeof project !== 'undefined'){
          page_to_link = project;
        }
        else if (typeof flowcell!== 'undefined') {
          page_to_link = flowcell;
        }
        else if(typeof workset_name !== 'undefined'){
          page_to_link = workset_name
        }
        note_id = 'running_note_'+page_to_link+'_'+(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(),
                   date.getUTCDate(), date.getHours(), date.getMinutes(), date.getSeconds())/1000);
        if ('category' in note){
            category=generate_category_label(note['category']);
        }
    }
  } catch(e){
    noteText = '<pre>'+make_project_links(note['note'])+'</pre>';
    var datestring = '?';
  }
  var printHyphen =category? ' - ': ' ';
  var panelClass='';
  if (note['category'] == 'Important') {
    panelClass = 'card-important';
  }
  return '<div class="card mb-2 mx-2">' +
      '<div class="card-header '+panelClass+'" id="'+note_id+'">'+
        '<a class="text-decoration-none" href="mailto:' + note['email'] + '">'+note['user']+'</a> - '+
       '<a class="text-decoration-none" href="#'+note_id+'">' + datestring + '</a>' + printHyphen +category +'</div><div class="card-body">'+noteText+'</div></div>';
}

function load_running_notes(wait) {
  // Clear previously loaded notes, if so
  note_url = get_note_url();
  $("#running_notes_panels").empty();
  return $.getJSON(note_url, function(data) {
    if(Object.keys(data).length == 0 || typeof data === 'undefined'){
      $('#running_notes_panels').html('<div class="well">No running notes found.</div>');
    } else {
      $.each(data, function(date, note) {
        $('#running_notes_panels').append(make_running_note(date, note));
      });
      check_img_sources($('#running_notes_panels img'));
    }
  }).fail(function( jqxhr, textStatus, error ) {
      try {
        var response = JSON.parse(jqxhr.responseText);
        var err = response['page_title'];
        var exception = $('<div/>').text(response['error_exception']).html(); // HTML encode string
        var debugging = "<p>For debugging purposes, we've tried to grab the error that triggered this page for you:</p>"+
                        '<p>&nbsp;</p><code class="well text-muted"><small>'+exception+'</small></code>';
      } catch(e) {
        var err = error+', '+textStatus;
        var debugging = '';
      }
      $('#running_notes_panels').append('<div class="alert alert-danger">' +
          '<h4>Error Loading Running Notes: '+err+'</h4>' +
          '<p>Apologies, running notes could not be loaded.' +
          'Running notes are retrieved from the LIMS, so these problems are usually ' +
          'due to connection problems. Please try again later and report if the problem persists.</p></div>'+debugging);
  });
}
function preview_running_notes(){
    var now = new Date();
    $('.todays_date').text(now.toDateString() + ', ' + now.toLocaleTimeString());
    var category = generate_category_label($('.rn-categ button.active').text());
    category = category ? ' - '+ category : category;
    $('#preview_category').html(category);
    var text = $('#new_note_text').val().trim();
    text = $('<div>').text(text).html();
    if (text.length > 0) {
        $('#running_note_preview_body').html(make_markdown(text));
        check_img_sources($('#running_note_preview_body img'));
    } else {
        $('#running_note_preview_body').html('<p class="text-muted"><em>Nothing to preview..</em></p>');
    }
    // update textarea height
    $('#new_note_text').css('height', $('#running_note_preview_panel').css('height'));
}
function filter_running_notes(search){
    search=search.toLowerCase();
    $('#running_notes_panels').children().each(function(){
        var header=$(this).children('.card-header').text();
        var note=$(this).children('.card-body').children().text();
        if (header.toLowerCase().indexOf(search) != -1 || note.toLowerCase().indexOf(search) != -1){
            $(this).show();
        }else{
            $(this).hide();
        }
    });
}
//Filter notes
$('#rn_search').keyup(function() {
    var search=$('#rn_search').val();
    filter_running_notes(search);
});

$(document).ready(function() {
    $('#rn_category').change(function() {
        var search=$('#rn_category :selected').text();
        if (search == 'All'){
            search='';
        }
        filter_running_notes(search);
    });
});

// Update the category buttons
$('.rn-categ button').click(function(e){
    e.preventDefault();
    var was_selected = $(this).hasClass('active');
    $('.rn-categ button').removeClass('active');
    if(!was_selected){
        $(this).addClass('active');
    }
    preview_running_notes();
});

//Remove hover text from clicked button
$(document).ready(function(){
      $('[data-toggle="tooltip"]').click(function (){
         $('[data-toggle="tooltip"]').tooltip("hide");
      });
})

// Preview running notes
$('#new_note_text').keyup(preview_running_notes);

// Insert new running note and reload the running notes table
$("#running_notes_form").submit( function(e) {
    e.preventDefault();
    var text = $('#new_note_text').val().trim();
    text = $('<div>').text(text).html();
    var category = $('.rn-categ button.active').text();
    if (text.length == 0) {
        alert("Error: No running note entered.");
        return false;
    }
    if (!$('.rn-categ button.active').text()) {
       if (!confirm("Are you sure that you want to submit without choosing a category?")) {
          return false;
       }
    }

    note_url = get_note_url()
    $('#save_note_button').addClass('disabled').text('Submitting...');
    $.ajax({
      type: 'POST',
      url: note_url,
      dataType: 'json',
      data: {"note": text, "category": category},
      error: function(xhr, textStatus, errorThrown) {
        alert('Error: '+xhr['responseText']+' ('+errorThrown+')');
        $('#save_note_button').removeClass('disabled').text('Submit Running Note');
        console.log(xhr);
        console.log(textStatus);
        console.log(errorThrown);
      },
      success: function(data, textStatus, xhr) {
        // Manually check whether the running note has saved - LIMS API always returns success
        note_url=get_note_url()
        $.getJSON(note_url, function(newdata) {
          var newNote = false;
          $.each(newdata, function(date, note) {
            if(data['note'] == note['note']){
              newNote = make_running_note(date, note);
            }
          });
          if(newNote){
            // Enable the submit button again
            $('#save_note_button').removeClass('disabled').text('Submit Running Note');
            // Clear the text box
            $('#new_note_text').val('');
            $('#running_note_preview_body').html('<p class="text-muted"><em>Nothing to preview..</em></p>');
            $('#new_note_text').css('height', $('#running_note_preview_panel').css('height'));
            // Cler the 'no running notes found' box if it's there
            if($('#running_notes_panels').html() == '<div class="well">No running notes found.</div>'){
              $('#running_notes_panels .well').slideUp(function(){ $(this).remove(); });
            }
            // Create a new running note and slide it in..
            var now = new Date();
            category=generate_category_label(category);
            var printHyphen =category? ' - ': ' ';
            $('<div class="card mb-2 mx-2"><div class="card-header bg-success-table">'+
                  '<a class="text-decoration-none" href="mailto:' + data['email'] + '">'+data['user']+'</a> - '+
                  now.toDateString() + ', ' + now.toLocaleTimeString(now)+ printHyphen + category +
                '</div><div class="card-body">'+make_markdown(data['note'])+
                '</div></div>').hide().prependTo('#running_notes_panels').slideDown();
            check_img_sources($('#running_notes_panels img'));
          } else {
            alert('Error - LIMS did not save your running note.');
            $('#save_note_button').removeClass('disabled').text('Submit Running Note');
          }
        });
      }
    });
});

$(document).ready().delay(1000).queue(function(){$('#new_note_text').sew({values:window.users})});
