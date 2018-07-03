var wordlist = function (_opts){
                
    var defaults = {
         chunk_size: 1024 * 1024, /*bytes: 1MB = 1024 * 1024 */
    }

    var _file = null;
    var me = this;
    var opts = $.extend({}, defaults, _opts);
    var _list = {};
    /*temp variable*/
    var _temp = {}

    this.is_file_supported = function(){
        return ((typeof(File)!=='undefined')
               &&
               (typeof(Blob)!=='undefined')
               &&
               (typeof(FileReader)!=='undefined')
               &&
               (!!Blob.prototype.webkitSlice||!!Blob.prototype.mozSlice||!!Blob.prototype.slice||false)
               );
    }

    this.resetList = function(){
        _list = {};
        _temp = {};
    }

    this.getList = function(){
        return _list;
    }

    /**
     * upload_field.change(function(e){wordlistObj.setFile(e.target.files);});
     * @returns {undefined}
     */
    this.setFile = function(files){
        if(!files || files.length == 0){
            return;
        }

        var entry, item, i, ii;
        for (i = 0, ii = files.length; i < ii; i++) {
          item = files[i];
          if ((item.webkitGetAsEntry != null) && (entry = item.webkitGetAsEntry())) {
            if (entry.isFile) {
               _addFile(item.getAsFile());
            } 
          } else if (item.getAsFile != null) {
            if ((item.kind == null) || item.kind === 'file') {
               _addFile(item.getAsFile());
            }
          } else if(item instanceof File) {
              _addFile(item);
          }
        }
    }

    var _addFile = function(file){
        _file = file;
    }

    this.getFileName  = function(){
        return _file.fileName||_file.name;
    }

    this.hasFile = function(){
        return _file !== null
    }

    this.processFile = function(callback, procress_callback){
        if(!me.hasFile()){
            return false;
        }

        me.resetList();

        var chunk_parts = Math.ceil(_file.size / opts.chunk_size);
        var file_ext =  me.getFileName().toLowerCase().split(".");
        file_ext = file_ext[file_ext.length - 1];
        var type = "txt";
        if(file_ext == "xml" || file_ext == "tcf"){
            type = "tcf";
        }

        var _process_chunk = function(current_chunk){
            var startByte = current_chunk * opts.chunk_size;
            var endByte = startByte + opts.chunk_size;

            var func   = (_file.slice ? 'slice' : (_file.mozSlice ? 'mozSlice' : (_file.webkitSlice ? 'webkitSlice' : 'slice')));

            var temp_reader = new FileReader();
            temp_reader.onload =
            function(event)
            {
                if(type == "tcf"){
                    me.processTCF(event.target.result);
                } else {
                    me.processTXT(event.target.result, true);
                }

                if(current_chunk < chunk_parts){
                    if(typeof(procress_callback)!=='undefined'){
                        procress_callback(current_chunk + 1, chunk_parts);
                    }
                    setTimeout(function(){_process_chunk(current_chunk + 1)},0);
                } else {
                    if(typeof(callback)!=='undefined'){
                        callback(me.getList());
                    }
                }

            };
            temp_reader.readAsText(_file[func](startByte,endByte),  'UTF-8');

        }


        setTimeout(function(){_process_chunk(0)},0);

        return true;
    }



    /**
    * Verarbeitet text zu token
    * @param string txt
    * @returns null
    */
   this.processTXT = function(txt, from_chunk){
       from_chunk = from_chunk || false;

       //_temp.txtbuffer, _list
       
       if(from_chunk && _temp.txtbuffer){
           txt = _temp.txtbuffer + txt;
       }
       
       var words = txt.split(/\s+/);
       
       var to =  words.length; 
       if(from_chunk){
           to--;
       }
       
       for(var i = 0; i < to;i++){
           
           var word = words[i].trim().replace(/[|&;$%@"<>()+,.]/g, "");;
           if(_list[word]){
               _list[word]++;
           } else {
               _list[word] = 1;
           }
       }
       
       if(from_chunk){
          _temp.txtbuffer = words[to];
       }
       
   }

   /**
    * 
    * @param txt
    * @returns null
    */
   this.processTCF = function(txt){
       _temp.tcf = _temp.tcf || {open: false, buffer: ""}
       
       while(txt.length > 0){
           if(!_temp.tcf.open){
               var start = txt.indexOf("<text>");
               if (start < 0){
                   break;
               }
               
               _temp.tcf.open = true;
               txt = txt.substring(start + 6);
               continue;
           }
           
           var end = txt.indexOf("</text>");
           if(end < 0){
               _temp.tcf.buffer = txt;
               break;
           }
           
          
           me.processTXT(_temp.tcf.buffer + txt.substring(0, end));
          _temp.tcf.buffer = "";
          _temp.tcf.open = false;
          txt = txt.substring(end + 7);
          
       }
   }

}